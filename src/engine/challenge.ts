/**
 * From a skill check to a lock.
 *
 * The game does not replace the die roll, it turns it into a lock to play:
 *   base gap  = DC − bonus                (what the character needs on the d20)
 *   final gap = base gap − (d20 − 10)     (the die rolled at the table shifts it)
 * A 10 on the die keeps the base lock; below it gets harder, above it gets easier.
 *
 * The final gap equals 10 − the check's margin (d20 + bonus − DC): a check that succeeds by the
 * book gives at most an Advanced lock, a failed one an Expert lock or worse.
 *
 * Optional HOUSE RULE, "d20 tiers": on top of its effect on the gap, the raw die colours the
 * attempt — 1 fumble (no game), 2-5 poor roll (harder lock, no yellow hints), 18-19 good roll
 * (fitting picks highlighted in green), 20 critical (automatic success). Without it, only the
 * gap matters, as with D&D-style ability checks where a natural 1 or 20 is not special.
 */
import { lockLevelForRequiredRoll, requiredRoll } from './levels';
import type { LockLevel } from './types';

/** d20 result that keeps the base lock (≈ the die's average). */
export const ROLL_PIVOT = 10;
/** Highest d20 counted as a poor roll (fumble excluded). */
export const POOR_ROLL_MAX = 5;
/** Lowest d20 counted as a good roll (critical excluded). */
export const GOOD_ROLL_MIN = 18;

export type RollOutcome = 'fumble' | 'poor' | 'normal' | 'good' | 'critical';

export function rollOutcome(roll: number): RollOutcome {
  if (roll <= 1) return 'fumble';
  if (roll <= POOR_ROLL_MAX) return 'poor';
  if (roll >= 20) return 'critical';
  if (roll >= GOOD_ROLL_MIN) return 'good';
  return 'normal';
}

export interface ChallengeInput {
  /** Difficulty Class set by the GM. */
  dc: number;
  /** Character's total bonus for the check. */
  bonus: number;
  /** d20 rolled at the table (1 to 20). */
  roll: number;
  /** House rule: special effects of the raw d20 (see file header). */
  houseTiers: boolean;
}

/** How the game is set up once the check is resolved. */
export interface GameSetup {
  level: LockLevel;
  /** Fitting picks highlighted in green (good roll). */
  aid: boolean;
  /** Yellow mark on picks whose fitting position was found (removed on a poor roll). */
  foundHints: boolean;
  /** One more trap decoy (poor roll). */
  hardened: boolean;
}

export interface ChallengeResult {
  baseGap: number;
  /** Effect of the die on the gap: positive = harder. */
  rollShift: number;
  gap: number;
  level: LockLevel | 'automatic';
  /** Tier of the raw die, or 'normal' when the house rule is off. */
  outcome: RollOutcome;
  /** The lock opens without playing (automatic success or critical). */
  alreadyOpen: boolean;
  /** Game to play: `null` on a fumble. When `alreadyOpen`, a Novice lock "for fun". */
  setup: GameSetup | null;
}

export function resolveChallenge({ dc, bonus, roll, houseTiers }: ChallengeInput): ChallengeResult {
  const baseGap = requiredRoll(dc, bonus);
  const rollShift = ROLL_PIVOT - roll;
  const gap = baseGap + rollShift;
  const level = lockLevelForRequiredRoll(gap);
  const outcome = houseTiers ? rollOutcome(roll) : 'normal';
  const alreadyOpen = level === 'automatic' || outcome === 'critical';
  // Already open: a Novice lock is offered "for fun".
  const playable: LockLevel = level === 'automatic' || alreadyOpen ? 'novice' : level;
  const setup: GameSetup | null =
    outcome === 'fumble'
      ? null
      : {
          level: playable,
          aid: outcome === 'good' || outcome === 'critical',
          foundHints: outcome !== 'poor',
          hardened: outcome === 'poor',
        };
  return { baseGap, rollShift, gap, level, outcome, alreadyOpen, setup };
}
