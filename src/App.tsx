/**
 * Single page with two phases:
 * - the challenge (DC, bonus, d20 → coloured result frame);
 * - the lock, once "Pick the lock" is pressed: the challenge hides and only the lock remains, with
 *   its sound and vibration buttons and a "New challenge" button to go back.
 * Settings (direct level, seed, shared link…) and the help live in dialogs.
 *
 * URL parameters `?seed=abc123&level=expert` open a precise lock straight away: the GM can send
 * the same link to every player.
 */
import { useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import {
  LOCK_LEVEL_ORDER,
  LOCK_LEVEL_ROLL_RANGES,
  POOR_ROLL_HARDENING,
  generateLock,
  newSeed,
  type GameSetup,
  type LockLevel,
  type Placement,
  type Run,
} from './engine';
import { useI18n } from './i18n';
import { STORAGE_KEYS, usePersistedBoolean } from './storage';
import { AppHeader } from './components/AppHeader';
import { ChallengeForm } from './components/ChallengeForm';
import { LockpickBoard } from './components/LockpickBoard';
import { SoundButtons } from './components/SoundButtons';
import { useSoundPrefs } from './components/useSoundPrefs';
import { LeaderboardDialog, SolvedLeaderboard } from './components/Leaderboard';
import { leaderboardEnabled, type LockRef } from './leaderboard';
import { COLORS } from './components/theme';

function isLevel(value: string | null): value is LockLevel {
  return !!value && (LOCK_LEVEL_ORDER as string[]).includes(value);
}

interface Game {
  seed: string;
  level: LockLevel;
  aid: boolean;
  foundHints: boolean;
  hardened: boolean;
}

const PLAIN = { aid: false, foundHints: true, hardened: false };

/** A shared link opens its lock directly; otherwise we start with the challenge. */
function initialState(): { game: Game; playing: boolean } {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  const level = params.get('level');
  return {
    game: { seed: seed || newSeed(), level: isLevel(level) ? level : 'advanced', ...PLAIN },
    playing: !!seed,
  };
}

export default function App() {
  const { t } = useI18n();
  const [initial] = useState(initialState);
  const [game, setGame] = useState<Game>(initial.game);
  const [playing, setPlaying] = useState(initial.playing);
  const [round, setRound] = useState(0);
  const [challengeRound, setChallengeRound] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seedDraft, setSeedDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const prefs = useSoundPrefs();
  const [highlightFits, setHighlightFits] = usePersistedBoolean(STORAGE_KEYS.highlightFits, false);
  const [houseTiers, setHouseTiers] = usePersistedBoolean(STORAGE_KEYS.houseTiers, true);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  /** Lock opened on this board (`boardKey`), with its run if it can be ranked. */
  const [finished, setFinished] = useState<{ boardKey: string; run: Run | null } | null>(null);
  /** Board on which the green help was switched on at some point: not ranked. */
  const [aidedKey, setAidedKey] = useState<string | null>(null);

  const boardKey = `${game.seed}:${game.level}:${game.hardened}:${round}`;
  const lockRef = useMemo<LockRef>(() => ({ seed: game.seed, level: game.level, hardened: game.hardened }), [game.seed, game.level, game.hardened]);

  const onSolved = (timeMs: number, placements: Placement[]) => {
    const ranked = !game.aid && !highlightFits && aidedKey !== boardKey;
    const moves = placements.map(({ pickId, rotation }) => ({ pickId, rotation }));
    setFinished({ boardKey, run: ranked ? { ...lockRef, moves, timeMs: Math.round(timeMs) } : null });
  };

  const lock = useMemo(
    () => generateLock(game.seed, game.level, game.hardened ? POOR_ROLL_HARDENING : undefined),
    [game.seed, game.level, game.hardened],
  );

  // While playing, the URL describes the lock on screen, ready to be shared.
  useEffect(() => {
    const query = playing ? `?${new URLSearchParams({ seed: game.seed, level: game.level }).toString()}` : '';
    window.history.replaceState(null, '', `${window.location.pathname}${query}`);
  }, [playing, game.seed, game.level]);

  /** A lock chosen in the settings: no roll effect. */
  const playPlain = (patch: Partial<Pick<Game, 'seed' | 'level'>>) => {
    setSeedDraft(null);
    setGame((g) => ({ ...g, ...patch, ...PLAIN }));
    setPlaying(true);
  };

  const startChallenge = (setup: GameSetup) => {
    setSeedDraft(null);
    setGame({ seed: newSeed(), ...setup });
    setPlaying(true);
    window.scrollTo({ top: 0 });
  };

  const newChallenge = () => {
    setChallengeRound((r) => r + 1);
    setPlaying(false);
  };

  const draft = seedDraft ?? game.seed;

  /** Trophy: in the header on wide screens, next to the lock or the challenge on phones (the header is full). */
  const leaderboardButton = (place: 'header' | 'inline') =>
    leaderboardEnabled && (
      <Tooltip title={t.leaderboard}>
        <IconButton
          aria-label={t.leaderboard}
          onClick={() => setLeaderboardOpen(true)}
          data-testid={place === 'header' ? 'open-leaderboard' : undefined}
          sx={{ display: place === 'header' ? { xs: 'none', sm: 'inline-flex' } : { sm: 'none' } }}
        >
          <EmojiEventsRoundedIcon />
        </IconButton>
      </Tooltip>
    );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      <AppHeader
        title={t.appTitle}
        actions={
          <>
            {leaderboardButton('header')}
            <Button href="mj/" size="small" data-testid="gm-mode">
              {t.gmMode}
            </Button>
            <Tooltip title={t.settings}>
              <IconButton aria-label={t.settings} onClick={() => setSettingsOpen(true)} data-testid="open-settings">
                <TuneRoundedIcon />
              </IconButton>
            </Tooltip>
          </>
        }
      />

      {/* Kept mounted while playing: the DC and bonus are still there for the next challenge. */}
      <Paper sx={{ p: 2, display: playing ? 'none' : 'block', maxWidth: 720, mx: 'auto' }} data-testid="challenge">
        <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
            {t.challengeTitle}
          </Typography>
          {leaderboardButton('inline')}
        </Stack>
        <ChallengeForm round={challengeRound} houseTiers={houseTiers} onHouseTiersChange={setHouseTiers} onStart={startChallenge} />
      </Paper>

      {playing && (
        <Paper sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: COLORS.background, backgroundImage: 'none' }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700, color: COLORS.gold, minWidth: 0 }} data-testid="board-title">
              {t.boardTitle(t.levels[game.level])}
              {game.aid ? t.flagAid : ''}
              {game.foundHints ? '' : t.flagNoHints}
              {game.hardened ? t.flagHardened : ''}
            </Typography>
            <Button size="small" onClick={newChallenge} data-testid="new-challenge">
              {t.newChallenge}
            </Button>
            {leaderboardButton('inline')}
            <SoundButtons prefs={prefs} />
          </Stack>
          <LockpickBoard
            key={boardKey}
            lock={lock}
            muted={prefs.muted}
            vibration={!prefs.vibrationOff}
            highlightFits={game.aid || highlightFits}
            foundHints={game.foundHints}
            onSolved={leaderboardEnabled ? onSolved : undefined}
          />
        </Paper>
      )}
      {playing && finished?.boardKey === boardKey && <SolvedLeaderboard key={boardKey} run={finished.run} lock={lockRef} />}

      {leaderboardEnabled && (
        <LeaderboardDialog open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} level={game.level} lock={playing ? lockRef : null} />
      )}

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t.settings}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t.settingsIntro}
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              size="small"
              label={t.levelLabel}
              value={game.level}
              onChange={(e) => playPlain({ level: e.target.value as LockLevel })}
              slotProps={{ htmlInput: { 'data-testid': 'level-select' } }}
            >
              {LOCK_LEVEL_ORDER.map((l) => (
                <MenuItem key={l} value={l}>
                  {t.levels[l]}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({t.gapRange(LOCK_LEVEL_ROLL_RANGES[l].min, LOCK_LEVEL_ROLL_RANGES[l].max)})
                  </Typography>
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label={t.seedLabel}
                value={draft}
                onChange={(e) => setSeedDraft(e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft) playPlain({ seed: draft });
                }}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={() => draft && playPlain({ seed: draft })} disabled={!draft || (playing && draft === game.seed)}>
                {t.load}
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Button variant="contained" onClick={() => playPlain({ seed: newSeed() })}>
                {t.newLock}
              </Button>
              <Button
                onClick={() => {
                  setRound((r) => r + 1);
                  setPlaying(true);
                }}
              >
                {t.restart}
              </Button>
              <Button
                disabled={!playing}
                onClick={() => {
                  void navigator.clipboard?.writeText(window.location.href);
                  setCopied(true);
                }}
              >
                {t.copyLink}
              </Button>
            </Stack>
            <FormControlLabel control={<Switch
                  checked={highlightFits}
                  onChange={(e) => {
                    setHighlightFits(e.target.checked);
                    // On at some point during this lock: not ranked, even if switched off again.
                    if (playing) setAidedKey(boardKey);
                  }}
                />} label={t.highlightFits} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>{t.close}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={copied} autoHideDuration={2500} onClose={() => setCopied(false)} message={t.linkCopied} />
    </Container>
  );
}
