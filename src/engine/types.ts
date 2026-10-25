/**
 * Lockpicking mini-game model, inspired by Starfield's digipick puzzle.
 *
 * A lock is made of concentric rings cut into `POSITIONS` slots, some of which are notches.
 * A pick carries teeth; rotated one step at a time, it only goes into the active ring if
 * every tooth lands on a free notch. Rings are filled from the outside (index 0) inwards.
 *
 * Positions and teeth are handled as 32-bit MASKS (bit i = slot i): 32 slots fit exactly in
 * one integer, and "the pick fits" becomes a single bitwise AND.
 */

/** Slots per ring (Starfield uses 32). Tied to the 32-bit masks. */
export const POSITIONS = 32;

/** Lock levels (see `LOCK_LEVELS`). */
export type LockLevel = 'novice' | 'advanced' | 'expert' | 'master' | 'grandMaster';

export interface LockRing {
  /** Mask of the ring's notches. */
  gaps: number;
}

export interface LockPick {
  /** Stable id within the lock (`p0`, `p1`…). */
  id: string;
  /** Teeth mask at rotation 0. */
  teeth: number;
}

/** Makes a lock harder, for instance after a poor die roll. */
export interface LockHardening {
  /** Trap decoys added on top of the level's own. */
  extraTraps: number;
  /** Teeth of those traps: few teeth = many possible rotations = more false leads. */
  trapTeeth: [number, number];
}

/** A placed pick: which ring, at which rotation (0 → POSITIONS-1). */
export interface Placement {
  pickId: string;
  ring: number;
  rotation: number;
}

export interface Lock {
  seed: string;
  level: LockLevel;
  /** Index 0 = outer ring, the first one to fill. */
  rings: LockRing[];
  /** Picks offered to the player, shuffled (solution + decoys). */
  picks: LockPick[];
  /** Reference solution built by the generator. Others may exist. */
  solution: Placement[];
  /** Picks added as decoys by the generator. */
  decoyIds: string[];
}

/** A game in progress: the lock never changes, only placements pile up. */
export interface LockpickState {
  lock: Lock;
  /** Placements in order (undo = drop the last one). */
  placements: Placement[];
}
