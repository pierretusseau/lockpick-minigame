import { describe, expect, it } from 'vitest';
import {
  LOCK_LEVELS,
  LOCK_LEVEL_ORDER,
  POOR_ROLL_HARDENING,
  activeRing,
  canPlace,
  createGame,
  distinctRotations,
  fittingRotations,
  generateLock,
  isSolved,
  isStillSolvable,
  isSubset,
  lockLevelForRequiredRoll,
  maskFromPositions,
  place,
  popCount,
  positionsFromMask,
  requiredRoll,
  resolveChallenge,
  rollOutcome,
  rotateMask,
  solve,
  undo,
  type Lock,
  type LockpickState,
} from './index';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed${i}`);

function playSolution(lock: Lock): LockpickState {
  let state = createGame(lock);
  for (const pl of lock.solution) {
    const next = place(state, pl.pickId, pl.rotation);
    expect(next, `placement ${pl.pickId} refused`).not.toBeNull();
    state = next!;
  }
  return state;
}

describe('masks', () => {
  it('rotation wraps around 32 slots', () => {
    const m = maskFromPositions([0, 31]);
    expect(positionsFromMask(rotateMask(m, 1))).toEqual([0, 1]);
    expect(rotateMask(m, 32)).toBe(m);
    expect(rotateMask(rotateMask(m, 5), -5)).toBe(m);
  });

  it('a symmetric pattern has fewer than 32 distinct rotations', () => {
    const everyOther = maskFromPositions(Array.from({ length: 16 }, (_, i) => i * 2));
    expect(distinctRotations(everyOther)).toHaveLength(2);
  });
});

describe('generator', () => {
  it('same seed and level ⇒ same lock', () => {
    for (const level of LOCK_LEVEL_ORDER) expect(generateLock('abc123', level)).toEqual(generateLock('abc123', level));
  });

  it('different seeds ⇒ different locks', () => {
    expect(generateLock('a', 'expert')).not.toEqual(generateLock('b', 'expert'));
  });

  it.each(LOCK_LEVEL_ORDER)('level %s: expected shape, valid reference solution', (level) => {
    const config = LOCK_LEVELS[level];
    for (const seed of SEEDS) {
      const lock = generateLock(seed, level);
      expect(lock.rings).toHaveLength(config.rings);
      const decoys = new Set(lock.decoyIds);
      for (const pick of lock.picks) {
        const n = popCount(pick.teeth);
        if (!decoys.has(pick.id)) {
          expect(n).toBeGreaterThanOrEqual(config.teethPerPick[0]);
          expect(n).toBeLessThanOrEqual(config.teethPerPick[1]);
        }
      }
      expect(lock.decoyIds.length).toBeLessThanOrEqual(config.trapDecoys + config.uselessDecoys);
      expect(isSolved(playSolution(lock))).toBe(true);
    }
  });

  it('every generated lock is solvable', () => {
    for (const level of LOCK_LEVEL_ORDER) {
      for (const seed of SEEDS) expect(solve(generateLock(seed, level)).count).toBeGreaterThan(0);
    }
  });

  it('decoys belong to no complete solution', () => {
    for (const seed of SEEDS) {
      const lock = generateLock(seed, 'master');
      for (const id of lock.decoyIds) expect(solve(lock, { requirePickId: id }).count).toBe(0);
    }
  });
});

describe('poor roll hardening', () => {
  it('same rings, one more decoy, still solvable, trap outside every solution', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const base = generateLock(seed, 'expert');
      const hard = generateLock(seed, 'expert', POOR_ROLL_HARDENING);
      expect(hard.rings).toEqual(base.rings);
      expect(hard.decoyIds.length).toBe(base.decoyIds.length + 1);
      expect(solve(hard).count).toBeGreaterThan(0);
      for (const id of hard.decoyIds) expect(solve(hard, { requirePickId: id }).count).toBe(0);
    }
  });
});

describe('game', () => {
  const lock = generateLock('game', 'expert');

  it('refuses an invalid move', () => {
    const state = createGame(lock);
    const pl = lock.solution[0];
    const wrong = Array.from({ length: 32 }, (_, r) => r).find((r) => !canPlace(state, pl.pickId, r));
    if (wrong !== undefined) expect(place(state, pl.pickId, wrong)).toBeNull();
    expect(place(state, 'missing', 0)).toBeNull();
    const placed = place(state, pl.pickId, pl.rotation)!;
    expect(place(placed, pl.pickId, pl.rotation)).toBeNull();
  });

  it('accepts exactly the rotations that fit the active ring', () => {
    const state = createGame(lock);
    for (const pick of lock.picks) {
      for (let r = 0; r < 32; r++) expect(canPlace(state, pick.id, r)).toBe(isSubset(rotateMask(pick.teeth, r), lock.rings[0].gaps));
    }
  });

  it('a full ring moves on to the next one, undo goes back', () => {
    let state = createGame(lock);
    const ring0 = lock.solution.filter((p) => p.ring === 0);
    for (const pl of ring0) state = place(state, pl.pickId, pl.rotation)!;
    expect(activeRing(state)).toBe(1);
    expect(activeRing(undo(state))).toBe(0);
    expect(fittingRotations(createGame(lock), lock.solution[0].pickId)).toContain(lock.solution[0].rotation);
  });

  it('detects a dead end', () => {
    let deadEnd = false;
    for (const l of SEEDS.map((s) => generateLock(s, 'expert'))) {
      const state = createGame(l);
      for (const id of l.decoyIds) for (const r of fittingRotations(state, id)) if (!isStillSolvable(place(state, id, r)!)) deadEnd = true;
    }
    expect(deadEnd).toBe(true);
  });
});

describe('levels', () => {
  it('gap = DC − bonus', () => {
    expect(requiredRoll(15, 5)).toBe(10);
    expect(requiredRoll(15, -5)).toBe(20);
  });

  it.each([
    [-3, 'automatic'],
    [1, 'automatic'],
    [2, 'novice'],
    [5, 'novice'],
    [6, 'advanced'],
    [10, 'advanced'],
    [11, 'expert'],
    [15, 'expert'],
    [16, 'master'],
    [20, 'master'],
    [21, 'grandMaster'],
    [35, 'grandMaster'],
  ] as const)('gap %i ⇒ %s', (gap, level) => {
    expect(lockLevelForRequiredRoll(gap)).toBe(level);
  });
});

describe('challenge', () => {
  it('a 10 keeps the base gap, the die shifts it', () => {
    expect(resolveChallenge({ dc: 15, bonus: 5, roll: 10, houseTiers: false }).gap).toBe(10);
    expect(resolveChallenge({ dc: 15, bonus: 5, roll: 14, houseTiers: false }).gap).toBe(6);
    expect(resolveChallenge({ dc: 15, bonus: 5, roll: 3, houseTiers: false }).gap).toBe(17);
  });

  it('a check that succeeds by the book gives at most an Advanced lock', () => {
    for (let roll = 1; roll <= 20; roll++) {
      const r = resolveChallenge({ dc: 15, bonus: 5, roll, houseTiers: false });
      if (roll + 5 >= 15) expect(['automatic', 'novice', 'advanced']).toContain(r.level);
      else expect(['expert', 'master', 'grandMaster']).toContain(r.level);
    }
  });

  it('without the house rule, a natural 1 or 20 is not special', () => {
    const one = resolveChallenge({ dc: 10, bonus: 8, roll: 1, houseTiers: false });
    expect(one.outcome).toBe('normal');
    expect(one.setup).not.toBeNull();
    const twenty = resolveChallenge({ dc: 30, bonus: 0, roll: 20, houseTiers: false });
    expect(twenty.alreadyOpen).toBe(false);
    expect(twenty.setup?.aid).toBe(false);
  });

  it('with the house rule, the raw die has its tiers', () => {
    expect(rollOutcome(1)).toBe('fumble');
    expect(rollOutcome(5)).toBe('poor');
    expect(rollOutcome(17)).toBe('normal');
    expect(rollOutcome(18)).toBe('good');
    expect(rollOutcome(20)).toBe('critical');
    expect(resolveChallenge({ dc: 15, bonus: 0, roll: 1, houseTiers: true }).setup).toBeNull();
    const poor = resolveChallenge({ dc: 15, bonus: 0, roll: 3, houseTiers: true }).setup!;
    expect(poor).toMatchObject({ hardened: true, foundHints: false, aid: false });
    expect(resolveChallenge({ dc: 15, bonus: 0, roll: 19, houseTiers: true }).setup!.aid).toBe(true);
    expect(resolveChallenge({ dc: 30, bonus: 0, roll: 20, houseTiers: true }).alreadyOpen).toBe(true);
  });
});
