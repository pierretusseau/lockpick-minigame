/**
 * Leaderboard: checks a finished run before it is ranked.
 *
 * The lock is rebuilt from its seed and the player's moves are replayed with the normal game
 * rules: a run only counts if the lock really opens. The time itself cannot be proven (it is
 * measured by the player's browser), so we only reject times too short for a human.
 */
import { createGame, isSolved, place } from './game';
import { generateLock } from './generator';
import { LOCK_LEVEL_ORDER, POOR_ROLL_HARDENING } from './levels';
import type { LockLevel } from './types';

/** One move sent by the player: which pick, at which rotation (the ring is implied). */
export interface RunMove {
  pickId: string;
  rotation: number;
}

export interface Run {
  seed: string;
  level: LockLevel;
  /** Lock made harder by a poor roll (one more decoy): another lock than the plain one. */
  hardened: boolean;
  moves: RunMove[];
  timeMs: number;
}

/** Fastest believable pace: select, rotate and insert a pick. */
export const MIN_MS_PER_MOVE = 250;
/** Longer runs are not ranked (a tab left open). */
export const MAX_RUN_MS = 60 * 60 * 1000;
export const MAX_SEED_LENGTH = 40;
export const MAX_NAME_LENGTH = 20;

export function isLockLevel(value: unknown): value is LockLevel {
  return typeof value === 'string' && (LOCK_LEVEL_ORDER as string[]).includes(value);
}

/** Player name as shown on the leaderboard: trimmed, no control characters; `null` if empty. */
export function cleanPlayerName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  const clean = name.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').replace(/\s+/g, ' ').trim();
  return clean ? Array.from(clean).slice(0, MAX_NAME_LENGTH).join('') : null;
}

/** Reads an untrusted run (JSON from the network); `null` if its shape is wrong. */
export function parseRun(data: unknown): Run | null {
  if (!data || typeof data !== 'object') return null;
  const { seed, level, hardened, moves, timeMs } = data as Record<string, unknown>;
  if (typeof seed !== 'string' || !seed || seed.length > MAX_SEED_LENGTH) return null;
  if (!isLockLevel(level) || typeof hardened !== 'boolean') return null;
  if (typeof timeMs !== 'number' || !Number.isInteger(timeMs) || timeMs <= 0) return null;
  if (!Array.isArray(moves) || moves.length === 0 || moves.length > 64) return null;
  const parsed: RunMove[] = [];
  for (const move of moves as unknown[]) {
    if (!move || typeof move !== 'object') return null;
    const { pickId, rotation } = move as Record<string, unknown>;
    if (typeof pickId !== 'string' || typeof rotation !== 'number' || !Number.isInteger(rotation)) return null;
    parsed.push({ pickId, rotation });
  }
  return { seed, level, hardened, moves: parsed, timeMs };
}

export type RunCheck = 'ok' | 'notSolved' | 'tooFast' | 'tooSlow';

/** Replays the moves on the rebuilt lock. */
export function checkRun(run: Run): RunCheck {
  if (run.timeMs > MAX_RUN_MS) return 'tooSlow';
  if (run.timeMs < run.moves.length * MIN_MS_PER_MOVE) return 'tooFast';
  let state = createGame(generateLock(run.seed, run.level, run.hardened ? POOR_ROLL_HARDENING : undefined));
  for (const move of run.moves) {
    const next = place(state, move.pickId, move.rotation);
    if (!next) return 'notSolved';
    state = next;
  }
  return isSolved(state) ? 'ok' : 'notSolved';
}
