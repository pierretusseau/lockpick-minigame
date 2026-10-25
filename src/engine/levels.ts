/**
 * Lock levels, and how a skill check maps to one.
 *
 * The GAP is what the character would need on the d20: DC − bonus. The die rolled at the table
 * then shifts it (see `challenge.ts`), and the final gap picks the level.
 */
import type { LockHardening, LockLevel } from './types';

export interface LockLevelConfig {
  /** Number of rings. */
  rings: number;
  /** Solution picks per ring [min, max]. */
  picksPerRing: [number, number];
  /** Teeth per solution pick [min, max]. */
  teethPerPick: [number, number];
  /** Decoys that fit in a ring but belong to no solution. */
  trapDecoys: number;
  /** Decoys that fit in no ring. */
  uselessDecoys: number;
}

/**
 * Tuned through play-testing. Share of locks won when playing AT RANDOM without ever undoing,
 * measured over 400 locks (a real player thinks and undoes, and does much better):
 *   Novice ~91 % · Advanced ~62 % · Expert ~50 % · Master ~26 % · Grand master ~17 %
 * Main levers: picks with 4-5 teeth (fewer possible rotations, so fewer false leads) and few
 * trap decoys.
 */
export const LOCK_LEVELS: Record<LockLevel, LockLevelConfig> = {
  novice: { rings: 2, picksPerRing: [2, 2], teethPerPick: [4, 5], trapDecoys: 0, uselessDecoys: 1 },
  advanced: { rings: 2, picksPerRing: [2, 3], teethPerPick: [4, 5], trapDecoys: 0, uselessDecoys: 2 },
  expert: { rings: 3, picksPerRing: [2, 2], teethPerPick: [4, 5], trapDecoys: 1, uselessDecoys: 1 },
  master: { rings: 3, picksPerRing: [2, 3], teethPerPick: [4, 5], trapDecoys: 1, uselessDecoys: 1 },
  grandMaster: { rings: 4, picksPerRing: [2, 3], teethPerPick: [4, 5], trapDecoys: 1, uselessDecoys: 1 },
};

/**
 * Poor roll (house rule, 2 to 5 on the d20): one more trap decoy, 4-5 teeth like the others.
 * Deliberately light (a poor roll already makes the lock harder and removes the yellow hints):
 * over 400 locks it costs about a third of the chances when playing at random.
 */
export const POOR_ROLL_HARDENING: LockHardening = { extraTraps: 1, trapTeeth: [4, 5] };

export const LOCK_LEVEL_ORDER: LockLevel[] = ['novice', 'advanced', 'expert', 'master', 'grandMaster'];

/** Gap: DC − character bonus (= what the character would need on the d20). */
export function requiredRoll(difficulty: number, bonus: number): number {
  return difficulty - bonus;
}

/**
 * Gap leading to each level (bounds included, `null` = unbounded).
 * ≤ 1: automatic success (no lock to play).
 */
export const LOCK_LEVEL_ROLL_RANGES: Record<LockLevel, { min: number; max: number | null }> = {
  novice: { min: 2, max: 5 },
  advanced: { min: 6, max: 10 },
  expert: { min: 11, max: 15 },
  master: { min: 16, max: 20 },
  grandMaster: { min: 21, max: null },
};

/**
 * Lock level for a given gap.
 * ≤ 1: automatic success; 2-5 Novice; 6-10 Advanced; 11-15 Expert; 16-20 Master; ≥ 21 Grand master.
 */
export function lockLevelForRequiredRoll(required: number): LockLevel | 'automatic' {
  if (required < LOCK_LEVEL_ROLL_RANGES.novice.min) return 'automatic';
  return LOCK_LEVEL_ORDER.find((level) => {
    const { max } = LOCK_LEVEL_ROLL_RANGES[level];
    return max === null || required <= max;
  })!;
}
