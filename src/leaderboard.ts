/**
 * Leaderboard client. The API is a small Cloudflare Worker (`worker/`); its address comes from
 * `VITE_LEADERBOARD_URL` at build time. Without it, the leaderboard is simply hidden.
 */
import type { LockLevel, Run } from './engine';
import { STORAGE_KEYS } from './storage';

export const LEADERBOARD_URL: string = (import.meta.env.VITE_LEADERBOARD_URL ?? '').replace(/\/$/, '');
export const leaderboardEnabled = LEADERBOARD_URL !== '';

export interface Entry {
  name: string;
  timeMs: number;
  me: boolean;
}

export interface Board {
  top: Entry[];
  myRank: number | null;
  myTimeMs: number | null;
}

export interface Boards {
  level: Board;
  /** Board of one precise lock; `null` when none was asked. */
  lock: Board | null;
}

export interface LockRef {
  seed: string;
  level: LockLevel;
  hardened: boolean;
}

/** Thrown when the server refuses a run (moves that do not open the lock, inhuman time…). */
export class RunRefusedError extends Error {}

/** Random id of this browser: lets the server say which line is "me". */
export function playerId(): string {
  let id = localStorage.getItem(STORAGE_KEYS.playerId);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.playerId, id);
  }
  return id;
}

export function savedPlayerName(): string {
  return localStorage.getItem(STORAGE_KEYS.playerName) ?? '';
}

export function savePlayerName(name: string): void {
  localStorage.setItem(STORAGE_KEYS.playerName, name);
}

export async function fetchBoards(level: LockLevel, lock: LockRef | null): Promise<Boards> {
  const params = new URLSearchParams({ level, player: playerId() });
  if (lock) {
    params.set('seed', lock.seed);
    params.set('hardened', lock.hardened ? '1' : '0');
  }
  const res = await fetch(`${LEADERBOARD_URL}/scores?${params.toString()}`);
  if (!res.ok) throw new Error(`leaderboard ${res.status}`);
  return (await res.json()) as Boards;
}

export async function submitRun(name: string, run: Run): Promise<Boards> {
  const res = await fetch(`${LEADERBOARD_URL}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: playerId(), name, run }),
  });
  if (res.status === 422) throw new RunRefusedError();
  if (!res.ok) throw new Error(`leaderboard ${res.status}`);
  return (await res.json()) as Boards;
}
