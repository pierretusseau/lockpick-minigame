/**
 * Game flow: pure functions over `LockpickState`. Nothing is mutated: every move returns a
 * new state, which makes undo trivial.
 */
import { isSubset, positionsFromMask, rotateMask } from './mask';
import { remainingGaps, solve } from './solver';
import { POSITIONS, type Lock, type LockpickState, type Placement } from './types';

export function createGame(lock: Lock): LockpickState {
  return { lock, placements: [] };
}

/** Index of the ring to fill, or -1 once the lock is open. */
export function activeRing(state: LockpickState): number {
  return remainingGaps(state.lock, state.placements).findIndex((g) => g !== 0);
}

export function isSolved(state: LockpickState): boolean {
  return activeRing(state) === -1;
}

export function isPickUsed(state: LockpickState, pickId: string): boolean {
  return state.placements.some((p) => p.pickId === pickId);
}

/** Teeth mask of a pick at a given rotation. */
export function pickMask(lock: Lock, pickId: string, rotation: number): number {
  const pick = lock.picks.find((p) => p.id === pickId);
  return pick ? rotateMask(pick.teeth, rotation) : 0;
}

export function canPlace(state: LockpickState, pickId: string, rotation: number): boolean {
  const ring = activeRing(state);
  if (ring === -1 || isPickUsed(state, pickId)) return false;
  if (!state.lock.picks.some((p) => p.id === pickId)) return false;
  const free = remainingGaps(state.lock, state.placements)[ring];
  return isSubset(pickMask(state.lock, pickId, rotation), free);
}

/** Places a pick on the active ring; `null` if the move is refused. */
export function place(state: LockpickState, pickId: string, rotation: number): LockpickState | null {
  if (!canPlace(state, pickId, rotation)) return null;
  const normalized = ((rotation % POSITIONS) + POSITIONS) % POSITIONS;
  const placement: Placement = { pickId, ring: activeRing(state), rotation: normalized };
  return { ...state, placements: [...state.placements, placement] };
}

/** Removes the last placement (unlimited undo). No effect when nothing was placed. */
export function undo(state: LockpickState): LockpickState {
  if (state.placements.length === 0) return state;
  return { ...state, placements: state.placements.slice(0, -1) };
}

/** Rotations at which a pick fits in the active ring (empty = it does not fit). */
export function fittingRotations(state: LockpickState, pickId: string): number[] {
  const out: number[] = [];
  for (let r = 0; r < POSITIONS; r++) if (canPlace(state, pickId, r)) out.push(r);
  return out;
}

/** For each ring, slot → pick occupying it (rendering). */
export function ringOccupancy(state: LockpickState): Map<number, string>[] {
  const out = state.lock.rings.map(() => new Map<number, string>());
  for (const pl of state.placements) {
    for (const pos of positionsFromMask(pickMask(state.lock, pl.pickId, pl.rotation))) {
      out[pl.ring].set(pos, pl.pickId);
    }
  }
  return out;
}

/** Can the game still be won without undoing? */
export function isStillSolvable(state: LockpickState): boolean {
  return solve(state.lock, { from: state.placements }).count > 0;
}
