import { describe, expect, it } from 'vitest';
import { generateLock } from './generator';
import { POOR_ROLL_HARDENING } from './levels';
import { MIN_MS_PER_MOVE, checkRun, cleanPlayerName, parseRun, type Run } from './verify';

function solvedRun(seed: string, hardened = false): Run {
  const lock = generateLock(seed, 'expert', hardened ? POOR_ROLL_HARDENING : undefined);
  const moves = lock.solution.map(({ pickId, rotation }) => ({ pickId, rotation }));
  return { seed, level: 'expert', hardened, moves, timeMs: 42_000 };
}

describe('leaderboard run check', () => {
  it('accepts the moves that open the lock', () => {
    expect(checkRun(solvedRun('k7f2q9'))).toBe('ok');
    expect(checkRun(solvedRun('k7f2q9', true))).toBe('ok');
  });

  it('refuses a lock left half open, or moves that do not fit', () => {
    const run = solvedRun('k7f2q9');
    expect(checkRun({ ...run, moves: run.moves.slice(0, -1) })).toBe('notSolved');
    expect(checkRun({ ...run, moves: [...run.moves].reverse() })).toBe('notSolved');
    expect(checkRun({ ...run, moves: [{ pickId: 'nope', rotation: 0 }] })).toBe('notSolved');
  });

  it('refuses moves made for another lock', () => {
    expect(checkRun({ ...solvedRun('k7f2q9'), seed: 'other1' })).toBe('notSolved');
  });

  it('refuses inhuman or endless times', () => {
    const run = solvedRun('k7f2q9');
    expect(checkRun({ ...run, timeMs: run.moves.length * MIN_MS_PER_MOVE - 1 })).toBe('tooFast');
    expect(checkRun({ ...run, timeMs: 2 * 60 * 60 * 1000 })).toBe('tooSlow');
  });

  it('parses only well-formed runs', () => {
    const run = solvedRun('k7f2q9');
    expect(parseRun(JSON.parse(JSON.stringify(run)))).toEqual(run);
    expect(parseRun({ ...run, level: 'legendary' })).toBeNull();
    expect(parseRun({ ...run, timeMs: 1.5 })).toBeNull();
    expect(parseRun({ ...run, moves: [] })).toBeNull();
    expect(parseRun({ ...run, seed: 'x'.repeat(41) })).toBeNull();
    expect(parseRun(null)).toBeNull();
  });

  it('cleans player names', () => {
    expect(cleanPlayerName('  Arya \n Stark ')).toBe('Arya Stark');
    expect(cleanPlayerName('\u0000\u0007')).toBeNull();
    expect(cleanPlayerName('Élodie-la-très-longue-voleuse')).toBe('Élodie-la-très-longu');
    expect(cleanPlayerName(42)).toBeNull();
  });
});
