/**
 * Game board: the lock as SVG and the available picks. Game logic lives in `../engine`; this
 * component only renders the state and forwards moves.
 *
 * Everything is played with a pointer (mouse or finger):
 * - choose a pick: click it in the list;
 * - rotate: drag around the lock (mouse) or swipe in a straight line, left/right (finger);
 * - insert: click the lock without dragging;
 * - undo: button above the lock, on the right (unlimited).
 *
 * Yellow: a pick for which the player found, while rotating it, a position that fits the current
 * ring. The hint is cleared when the ring changes (it no longer means anything).
 *
 * Timer above the lock, on the left: at 0 on a new lock, it starts with the "Start" button (lock blurred until
 * then) and stops when the lock opens.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import {
  POSITIONS,
  activeRing,
  createGame,
  fittingRotations,
  isPickUsed,
  isSubset,
  place,
  positionsFromMask,
  remainingGaps,
  ringOccupancy,
  rotateMask,
  undo,
  type Lock,
  type LockpickState,
} from '../engine';
import { formatDuration } from '../format';
import { useI18n } from '../i18n';
import { LockpicksIcon } from './LockpicksIcon';
import { PickGlyph } from './PickGlyph';
import { COLORS as C } from './theme';
import { playSound, vibrate, type GameSound } from './sound';

export interface LockpickBoardProps {
  lock: Lock;
  muted?: boolean;
  /** Vibrations (Android) matching the sounds — independent from muting. */
  vibration?: boolean;
  /** Highlights the picks that fit the active ring (good roll help). */
  highlightFits?: boolean;
  /** Yellow mark on found positions. Default: on. */
  foundHints?: boolean;
  /** Time limit (ms): the attempt fails once it is reached. */
  timeLimitMs?: number;
  /** The timer counts the time LEFT (default). Off: it counts up, the limit stays a surprise. */
  showTimeLimit?: boolean;
  /** Resumed attempt: when "Start" was pressed. The timer keeps running across reloads. */
  startedAt?: number;
  onStart?: (at: number) => void;
  onSolved?: (elapsedMs: number) => void;
  onTimeout?: () => void;
}

const VIEW = 400;
const CENTER = VIEW / 2;
const OUTER_RADIUS = 172;
const RING_STEP = 31;
const BAND = 17;
const STEP_DEG = 360 / POSITIONS;
/** Touch: horizontal distance (px) for one rotation step. */
const TOUCH_STEP_PX = 16;

function ringRadius(index: number): number {
  return OUTER_RADIUS - index * RING_STEP;
}

/** Timer clock, only read in event handlers and the interval. */
function clockNow(): number {
  return Date.now();
}

function normalize(rotation: number): number {
  return ((rotation % POSITIONS) + POSITIONS) % POSITIONS;
}

/** Notch or tooth drawn at the top of the circle, then rotated to its position. */
function Slot({ radius, position, width, height, fill, opacity = 1 }: { radius: number; position: number; width: number; height: number; fill: string; opacity?: number }) {
  return (
    <rect
      x={CENTER - width / 2}
      y={CENTER - radius - height / 2}
      width={width}
      height={height}
      rx={2}
      fill={fill}
      opacity={opacity}
      transform={`rotate(${position * STEP_DEG} ${CENTER} ${CENTER})`}
    />
  );
}

export function LockpickBoard({
  lock,
  muted = false,
  vibration = true,
  highlightFits = false,
  foundHints = true,
  timeLimitMs,
  showTimeLimit = true,
  startedAt,
  onStart,
  onSolved,
  onTimeout,
}: LockpickBoardProps) {
  const { t } = useI18n();
  const [started, setStarted] = useState(startedAt !== undefined);
  const [timedOut, setTimedOut] = useState(false);
  const [game, setGame] = useState<LockpickState>(() => createGame(lock));
  const [selectedId, setSelectedId] = useState<string | null>(lock.picks[0]?.id ?? null);
  /** CUMULATIVE rotation per pick (unbounded): the CSS animation never spins all the way round from 31 to 0. */
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [shakeKey, setShakeKey] = useState(0);
  const [pulseRing, setPulseRing] = useState<{ ring: number; key: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ angle: number; x: number; touch: boolean; moved: boolean } | null>(null);
  /** Picks the player found "fitting", for the given ring only. */
  const [found, setFound] = useState<{ ring: number; ids: ReadonlySet<string> }>({ ring: 0, ids: new Set() });
  const [timer, setTimer] = useState<{ start: number | null; end: number | null; now: number }>(() => ({
    start: startedAt ?? null,
    end: null,
    now: startedAt ?? 0,
  }));
  const intervalRef = useRef<number | null>(null);

  const ring = activeRing(game);
  const solved = ring === -1;
  /** Solved or out of time: no more moves. */
  const finished = solved || timedOut;
  const remaining = useMemo(() => remainingGaps(lock, game.placements), [lock, game.placements]);
  const occupancy = useMemo(() => ringOccupancy(game), [game]);
  const fits = useMemo(
    () => new Set(solved ? [] : lock.picks.filter((p) => fittingRotations(game, p.id).length > 0).map((p) => p.id)),
    [game, lock.picks, solved],
  );

  const foundIds = found.ring === ring ? found.ids : null;
  const markFound = (id: string) =>
    setFound((f) => {
      const ids = new Set(f.ring === ring ? f.ids : []);
      ids.add(id);
      return { ring, ids };
    });

  const sound = useCallback(
    (s: GameSound) => {
      if (!muted) playSound(s);
      if (vibration) vibrate(s);
    },
    [muted, vibration],
  );

  const stopTicking = () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  };
  // The interval reads the latest props through this ref (it is created once per start).
  const live = useRef({ timeLimitMs, onTimeout, sound });
  useEffect(() => {
    live.current = { timeLimitMs, onTimeout, sound };
  });

  /** Starts the timer interval; the attempt fails once the time limit is reached. */
  const startTicking = useCallback((start: number) => {
    const tick = () => {
      const now = clockNow();
      const { timeLimitMs: limit, onTimeout: timeout, sound: play } = live.current;
      if (limit !== undefined && now - start >= limit) {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
        intervalRef.current = null;
        setTimer({ start, end: start + limit, now });
        setTimedOut(true);
        play('deny');
        timeout?.();
        return;
      }
      setTimer((tm) => ({ ...tm, now }));
    };
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(tick, 50);
    tick();
  }, []);

  // Resumed attempt: the timer goes on from where it was. The interval never outlives the board.
  useEffect(() => {
    if (startedAt !== undefined) startTicking(startedAt);
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, at mount
  }, []);
  const elapsed = timer.start === null ? 0 : (timer.end ?? timer.now) - timer.start;
  /** With a visible time limit, the timer shows the time LEFT. */
  const countdown = timeLimitMs !== undefined && showTimeLimit;
  const shown = countdown ? Math.max(0, timeLimitMs - elapsed) : elapsed;
  const hurry = countdown && !solved && shown <= 10_000;

  const selected = !finished && selectedId && !isPickUsed(game, selectedId) ? lock.picks.find((p) => p.id === selectedId) ?? null : null;
  const selectedRotation = selected ? rotations[selected.id] ?? 0 : 0;
  const ghostFits = selected && !finished ? isSubset(rotateMask(selected.teeth, selectedRotation), remaining[ring]) : false;

  /** Does the pick fit the current ring at this rotation? */
  const fitsAt = (teeth: number, rotation: number) => !finished && isSubset(rotateMask(teeth, normalize(rotation)), remaining[ring]);

  const begin = () => {
    setStarted(true);
    const now = clockNow();
    setTimer({ start: now, end: null, now });
    startTicking(now);
    onStart?.(now);
    sound('select');
  };

  const select = (id: string) => {
    if (!started || isPickUsed(game, id) || finished) return;
    setSelectedId(id);
    const pick = lock.picks.find((p) => p.id === id);
    if (pick && fitsAt(pick.teeth, rotations[id] ?? 0)) {
      markFound(id);
      sound('fit');
    } else {
      sound('select');
    }
  };

  const rotate = (delta: number) => {
    if (!selected || finished) return;
    const nextRotation = selectedRotation + delta;
    // Functional update: several drag steps may arrive before the next render.
    setRotations((r) => ({ ...r, [selected.id]: (r[selected.id] ?? 0) + delta }));
    // "Positive" rattle when the pick reaches a position where it fits.
    if (fitsAt(selected.teeth, nextRotation)) {
      markFound(selected.id);
      sound('fit');
    } else {
      sound('rotate');
    }
  };

  const insert = () => {
    if (!selected || finished) return;
    const next = place(game, selected.id, normalize(selectedRotation));
    if (!next) {
      setShakeKey((k) => k + 1);
      sound('deny');
      return;
    }
    const nextRing = activeRing(next);
    setGame(next);
    if (nextRing === -1) {
      const now = clockNow();
      stopTicking();
      setTimer((tm) => ({ ...tm, end: now, now }));
      sound('unlock');
      onSolved?.(timer.start === null ? 0 : now - timer.start);
    } else if (nextRing !== ring) {
      sound('ringOpen');
      setPulseRing((p) => ({ ring, key: (p?.key ?? 0) + 1 }));
    } else {
      sound('insert');
    }
    // Next pick: the first one still free, in list order.
    const after = lock.picks.find((p) => p.id !== selected.id && !isPickUsed(next, p.id));
    setSelectedId(after?.id ?? null);
  };

  const undoLast = () => {
    const last = game.placements[game.placements.length - 1];
    if (!last || finished) return;
    setGame(undo(game));
    setSelectedId(last.pickId);
    sound('undo');
  };

  const pointerAngle = (e: PointerEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return (Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)) * 180) / Math.PI;
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!started) return;
    drag.current = { angle: pointerAngle(e), x: e.clientX, touch: e.pointerType === 'touch', moved: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer already released: just follow the moves over the lock.
    }
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    if (drag.current.touch) {
      // Touch screen: swipe in a STRAIGHT LINE, one step every TOUCH_STEP_PX wherever the finger
      // is (the circular gesture was too sensitive near the centre). Left = clockwise (like a
      // thumb pushing the bottom of the lock), right = counter-clockwise.
      const steps = Math.trunc((drag.current.x - e.clientX) / TOUCH_STEP_PX);
      if (steps !== 0) {
        rotate(steps);
        drag.current = { ...drag.current, x: drag.current.x - steps * TOUCH_STEP_PX, moved: true };
      }
      return;
    }
    const angle = pointerAngle(e);
    let delta = angle - drag.current.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const steps = Math.trunc(delta / STEP_DEG);
    if (steps !== 0) {
      rotate(steps);
      drag.current = { ...drag.current, angle: drag.current.angle + steps * STEP_DEG, moved: true };
    }
  };

  const onPointerUp = () => {
    const wasClick = drag.current && !drag.current.moved;
    drag.current = null;
    if (wasClick) insert();
  };

  return (
    <Box sx={{ color: C.steel }} data-testid="lockpick-board">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          // Lock in the middle: empty column on the left, picks on the right.
          display: { md: 'grid' },
          gridTemplateColumns: { md: '1fr minmax(0, 460px) 1fr' },
          gap: { md: 3 },
          alignItems: { xs: 'stretch', md: 'center' },
          '& > *': { m: { md: '0 !important' } },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            flex: '1 1 auto',
            // Mobile: the lock takes at most 45 % of the height, so that lock and picks fit on
            // screen without scrolling (a finger swiping over the lock rotates the pick).
            maxWidth: { xs: 'min(100%, 45dvh)', md: 460 },
            gridColumn: { md: 2 },
            width: '100%',
            mx: 'auto',
            '@keyframes lockpickShake': {
              '0%, 100%': { transform: 'translateX(0)' },
              '20%, 60%': { transform: 'translateX(-6px)' },
              '40%, 80%': { transform: 'translateX(6px)' },
            },
            '@keyframes lockpickPulse': {
              '0%': { opacity: 1, strokeWidth: BAND + 10 },
              '100%': { opacity: 0, strokeWidth: BAND },
            },
            '@keyframes lockpickOpen': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(90deg)' },
            },
            '@keyframes lockpickFadeIn': { from: { opacity: 0, transform: 'scale(0.9)' }, to: { opacity: 1, transform: 'scale(1)' } },
            '@media (prefers-reduced-motion: reduce)': { '& *': { animation: 'none !important', transition: 'none !important' } },
          }}
        >
          {/* Timer and undo ABOVE the lock, not over it: on mobile they got in the way of the swipe. */}
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography
              component="div"
              aria-label={t.timer}
              data-testid="lockpick-timer"
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(0,0,0,0.35)',
                color: solved ? C.gold : hurry ? C.miss : C.steel,
                fontFamily: 'monospace',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatDuration(shown)}
            </Typography>
            <Tooltip title={t.undoTooltip}>
              <span>
                <IconButton
                  aria-label={t.undo}
                  onClick={undoLast}
                  disabled={game.placements.length === 0 || finished}
                  sx={{ color: C.steel, bgcolor: 'rgba(0,0,0,0.35)', '&:hover': { bgcolor: 'rgba(0,0,0,0.55)' } }}
                >
                  <UndoRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Box sx={{ position: 'relative' }}>
            <Box
              key={shakeKey}
              sx={{
                animation: shakeKey ? 'lockpickShake 260ms ease-in-out' : undefined,
                filter: started ? 'none' : 'blur(10px)',
                transition: 'filter 300ms ease-out',
              }}
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${VIEW} ${VIEW}`}
                width="100%"
                role="img"
                aria-label={solved ? t.solved : `${t.boardAria}, ${t.ringAria(ring + 1, lock.rings.length)}`}
                style={{ touchAction: 'none', cursor: finished ? 'default' : 'grab', display: 'block', userSelect: 'none' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => (drag.current = null)}
              >
                <defs>
                  <radialGradient id="lockpick-plate" cx="50%" cy="45%" r="60%">
                    <stop offset="0%" stopColor="#3a2c1d" />
                    <stop offset="100%" stopColor={C.background} />
                  </radialGradient>
                  <radialGradient id="lockpick-core" cx="40%" cy="35%" r="70%">
                    <stop offset="0%" stopColor={C.brassBright} />
                    <stop offset="100%" stopColor={C.brassDim} />
                  </radialGradient>
                </defs>
                <circle cx={CENTER} cy={CENTER} r={CENTER - 2} fill="url(#lockpick-plate)" stroke={C.brassDim} strokeWidth={3} />
                <g
                  style={{
                    transformOrigin: `${CENTER}px ${CENTER}px`,
                    animation: solved ? 'lockpickOpen 700ms cubic-bezier(.5,0,.2,1) forwards' : undefined,
                  }}
                >
                  {lock.rings.map((r, i) => {
                    const radius = ringRadius(i);
                    const done = solved || i < ring;
                    const isActive = i === ring;
                    const stroke = done ? C.gold : isActive ? C.brass : C.brassDim;
                    const notchW = ((2 * Math.PI * radius) / POSITIONS) * 0.55;
                    return (
                      <g key={i} opacity={done || isActive ? 1 : 0.55}>
                        <circle cx={CENTER} cy={CENTER} r={radius} fill="none" stroke={stroke} strokeWidth={BAND} />
                        {isActive && (
                          <circle cx={CENTER} cy={CENTER} r={radius} fill="none" stroke={C.brassBright} strokeOpacity={0.35} strokeWidth={BAND + 4} />
                        )}
                        {positionsFromMask(r.gaps).map((p) => {
                          const filledBy = occupancy[i].get(p);
                          return (
                            <g key={p}>
                              <Slot radius={radius} position={p} width={notchW} height={BAND - 3} fill={C.notch} />
                              {filledBy && <Slot radius={radius} position={p} width={notchW * 0.7} height={BAND - 6} fill={done ? '#fff4cf' : C.steel} />}
                            </g>
                          );
                        })}
                        {pulseRing?.ring === i && (
                          <circle
                            key={pulseRing.key}
                            cx={CENTER}
                            cy={CENTER}
                            r={radius}
                            fill="none"
                            stroke={C.gold}
                            style={{ animation: 'lockpickPulse 600ms ease-out forwards' }}
                          />
                        )}
                      </g>
                    );
                  })}
                  {/* Selected pick overlaid on the active ring. */}
                  {selected && !solved && (
                    <g
                      style={{
                        transformOrigin: `${CENTER}px ${CENTER}px`,
                        transform: `rotate(${selectedRotation * STEP_DEG}deg)`,
                        transition: 'transform 110ms ease-out',
                      }}
                    >
                      {positionsFromMask(selected.teeth).map((p) => {
                        const absolute = normalize(p + selectedRotation);
                        const ok = ((remaining[ring] >>> absolute) & 1) === 1;
                        return (
                          <Slot
                            key={p}
                            radius={ringRadius(ring)}
                            position={p}
                            width={((2 * Math.PI * ringRadius(ring)) / POSITIONS) * 0.5}
                            height={BAND + 8}
                            fill={ok ? C.fit : C.miss}
                            opacity={0.9}
                          />
                        );
                      })}
                    </g>
                  )}
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={ringRadius(lock.rings.length - 1) - BAND - 6}
                    fill="url(#lockpick-core)"
                    stroke={ghostFits ? C.fit : C.brassDim}
                    strokeWidth={3}
                  />
                  {/* Stylised keyhole. */}
                  <circle cx={CENTER} cy={CENTER - 8} r={9} fill={C.notch} />
                  <path d={`M ${CENTER - 6} ${CENTER - 4} L ${CENTER + 6} ${CENTER - 4} L ${CENTER + 4} ${CENTER + 18} L ${CENTER - 4} ${CENTER + 18} Z`} fill={C.notch} />
                </g>
              </svg>
            </Box>
            {!started && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box
                  component="button"
                  type="button"
                  onClick={begin}
                  data-testid="lockpick-start"
                  sx={{
                    width: 132,
                    height: 132,
                    borderRadius: '50%',
                    border: `3px solid ${C.brassBright}`,
                    bgcolor: 'rgba(23,18,12,0.85)',
                    color: C.brassBright,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    cursor: 'pointer',
                    font: 'inherit',
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    boxShadow: '0 0 24px rgba(0,0,0,0.6)',
                    transition: 'transform 120ms, background-color 120ms',
                    '&:hover': { transform: 'scale(1.05)', bgcolor: 'rgba(40,30,18,0.95)' },
                  }}
                >
                  <LockpicksIcon size={44} />
                  {t.start}
                </Box>
              </Box>
            )}
            {finished && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  animation: 'lockpickFadeIn 400ms 500ms ease-out both',
                }}
              >
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 800, color: solved ? C.gold : C.miss, textShadow: '0 2px 12px #000, 0 0 2px #000', px: 2, py: 1, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.55)' }}
                  data-testid="board-end"
                >
                  {solved ? t.solved : t.timeUp}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* 340 px basis on desktop only: in a column (mobile) it would become a height. */}
        <Stack spacing={1.5} sx={{ flex: { xs: '0 0 auto', md: '1 1 340px' }, minWidth: 0, gridColumn: { md: 3 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(auto-fill, minmax(58px, 1fr))', sm: 'repeat(auto-fill, minmax(92px, 1fr))' },
              gap: { xs: 0.75, sm: 1.25 },
              filter: started ? 'none' : 'blur(8px)',
              pointerEvents: started ? undefined : 'none',
              transition: 'filter 300ms ease-out',
            }}
            aria-hidden={started ? undefined : true}
          >
            {lock.picks.map((pick, index) => {
              const used = isPickUsed(game, pick.id);
              const isSelected = selected?.id === pick.id;
              const fitsNow = highlightFits && fits.has(pick.id);
              // Yellow: position found by the player, as long as it stays valid in this ring.
              const foundNow = foundHints && !used && !fitsNow && !!foundIds?.has(pick.id) && fits.has(pick.id);
              const border = fitsNow ? C.fit : foundNow ? C.found : isSelected ? C.brassBright : 'rgba(255,255,255,0.12)';
              return (
                <Box
                  key={pick.id}
                  component="button"
                  type="button"
                  onClick={() => select(pick.id)}
                  disabled={used || finished}
                  aria-label={t.pick(index + 1, used)}
                  aria-pressed={isSelected}
                  sx={{
                    position: 'relative',
                    p: { xs: 0.25, sm: 0.5 },
                    // The thumbnail adapts to its column (small on mobile, 80 px at most).
                    '& svg': { width: '100%', height: 'auto', maxWidth: 80 },
                    borderRadius: 1.5,
                    border: `2px solid ${border}`,
                    bgcolor: isSelected ? 'rgba(226,184,103,0.16)' : foundNow ? 'rgba(245,220,60,0.08)' : 'rgba(0,0,0,0.25)',
                    // Selection: outer glow, still visible on a green or yellow pick.
                    boxShadow: isSelected ? `0 0 0 3px ${C.brassBright}66` : 'none',
                    cursor: used || finished ? 'default' : 'pointer',
                    opacity: used ? 0.25 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    color: 'inherit',
                    font: 'inherit',
                    transition: 'border-color 120ms, background-color 120ms, box-shadow 120ms, opacity 200ms',
                  }}
                >
                  <PickGlyph size={80} teeth={pick.teeth} rotation={rotations[pick.id] ?? 0} color={fitsNow || isSelected ? C.steel : '#9aa3ad'} />
                  <Typography variant="body2" sx={{ lineHeight: 1, fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {index + 1}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
