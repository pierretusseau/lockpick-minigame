/**
 * Exhaustive backtracking solver.
 *
 * On the active ring, it always targets the LOWEST notch still free and tries every unused
 * pick in every rotation that covers it without overflowing. Targeting one precise slot means
 * the same solution is never counted in several placement orders: each solution (a set of
 * placements) is counted once. The search space is tiny (about fifteen picks × 32 rotations),
 * so the answer is instant.
 */
import { distinctRotations, isSubset, lowestBit, rotateMask } from './mask';
import type { Lock, Placement } from './types';

export interface SolveOptions {
  /** Placements already made (default: none), to know whether the game can still be won. */
  from?: readonly Placement[];
  /** Stop after N solutions (default: 1). `Infinity` to count them all. */
  limit?: number;
  /** Forbidden picks (e.g. is the lock still solvable without a given decoy?). */
  excludePickIds?: readonly string[];
  /** A pick that must be part of the solution (e.g. can this decoy be used?). */
  requirePickId?: string;
}

export interface SolveResult {
  /** Number of solutions found (capped by `limit`). */
  count: number;
  /** First solution found (placements to ADD to `from`), or null. */
  first: Placement[] | null;
}

export function remainingGaps(lock: Lock, placements: readonly Placement[]): number[] {
  const remaining = lock.rings.map((r) => r.gaps >>> 0);
  const byId = new Map(lock.picks.map((p) => [p.id, p]));
  for (const pl of placements) {
    const pick = byId.get(pl.pickId);
    if (!pick) continue;
    const mask = rotateMask(pick.teeth, pl.rotation);
    remaining[pl.ring] = (remaining[pl.ring] & ~mask) >>> 0;
  }
  return remaining;
}

export function solve(lock: Lock, options: SolveOptions = {}): SolveResult {
  const from = options.from ?? [];
  const limit = options.limit ?? 1;
  const excluded = new Set(options.excludePickIds ?? []);
  const used = new Set(from.map((p) => p.pickId));
  const remaining = remainingGaps(lock, from);

  const candidates = lock.picks
    .filter((p) => !excluded.has(p.id))
    .map((p) => ({ id: p.id, rotations: distinctRotations(p.teeth) }));

  let count = 0;
  let first: Placement[] | null = null;
  const path: Placement[] = [];

  const dfs = (ringStart: number): void => {
    if (count >= limit) return;
    let ring = ringStart;
    while (ring < remaining.length && remaining[ring] === 0) ring++;
    if (ring === remaining.length) {
      if (options.requirePickId && !path.some((p) => p.pickId === options.requirePickId) && !used.has(options.requirePickId)) {
        return;
      }
      count++;
      if (!first) first = [...path];
      return;
    }
    const gaps = remaining[ring];
    const target = 1 << lowestBit(gaps);
    for (const c of candidates) {
      if (used.has(c.id)) continue;
      for (const { rotation, mask } of c.rotations) {
        if ((mask & target) === 0 || !isSubset(mask, gaps)) continue;
        used.add(c.id);
        remaining[ring] = (gaps & ~mask) >>> 0;
        path.push({ pickId: c.id, ring, rotation });
        dfs(ring);
        path.pop();
        remaining[ring] = gaps;
        used.delete(c.id);
        if (count >= limit) return;
      }
    }
  };

  dfs(0);
  return { count, first };
}
