/**
 * Lock generator.
 *
 * Locks are built BACKWARDS: for each ring we draw picks, and their teeth become the ring's
 * notches. So a lock always has at least one solution. Decoys are added afterwards, checked
 * by the solver:
 * - "trap": fits in a ring, but belongs to no complete solution;
 * - "useless": fits in no ring, whatever its rotation.
 */
import { LOCK_LEVELS, type LockLevelConfig } from './levels';
import { distinctRotations, isSubset, maskFromPositions, positionsFromMask, rotateMask } from './mask';
import { createRandom, randomInt, shuffle, type RandomFn } from './random';
import { solve } from './solver';
import { POSITIONS, type Lock, type LockHardening, type LockLevel, type LockPick, type Placement } from './types';

interface DraftPick {
  key: string;
  teeth: number;
  /** Solution placement (absent for a decoy). */
  ring?: number;
  rotation?: number;
}

const ALL_POSITIONS = Array.from({ length: POSITIONS }, (_, i) => i);
const MAX_DECOY_ATTEMPTS = 60;

/** Stores the teeth at a random rotation: the player has to find the right angle back. */
function hideRotation(random: RandomFn, absoluteMask: number): { teeth: number; rotation: number } {
  const rotation = randomInt(random, 0, POSITIONS - 1);
  return { teeth: rotateMask(absoluteMask, -rotation), rotation };
}

function buildSolution(random: RandomFn, config: LockLevelConfig): { gaps: number[]; picks: DraftPick[] } {
  const gaps: number[] = [];
  const picks: DraftPick[] = [];
  for (let ring = 0; ring < config.rings; ring++) {
    const count = randomInt(random, config.picksPerRing[0], config.picksPerRing[1]);
    const sizes = Array.from({ length: count }, () => randomInt(random, config.teethPerPick[0], config.teethPerPick[1]));
    const positions = shuffle(random, ALL_POSITIONS);
    let cursor = 0;
    let ringMask = 0;
    sizes.forEach((size, i) => {
      const absolute = maskFromPositions(positions.slice(cursor, cursor + size));
      cursor += size;
      ringMask |= absolute;
      const { teeth, rotation } = hideRotation(random, absolute);
      picks.push({ key: `r${ring}-${i}`, teeth, ring, rotation });
    });
    gaps.push(ringMask >>> 0);
  }
  return { gaps, picks };
}

function fitsAnyRing(teeth: number, gaps: readonly number[]): boolean {
  return distinctRotations(teeth).some(({ mask }) => gaps.some((g) => isSubset(mask, g)));
}

function toLock(seed: string, level: LockLevel, gaps: number[], drafts: DraftPick[], random: RandomFn): Lock {
  const ordered = shuffle(random, drafts);
  const picks: LockPick[] = ordered.map((d, i) => ({ id: `p${i}`, teeth: d.teeth }));
  const solution: Placement[] = [];
  const decoyIds: string[] = [];
  ordered.forEach((d, i) => {
    if (d.ring === undefined || d.rotation === undefined) decoyIds.push(`p${i}`);
    else solution.push({ pickId: `p${i}`, ring: d.ring, rotation: d.rotation });
  });
  solution.sort((a, b) => a.ring - b.ring);
  return { seed, level, rings: gaps.map((g) => ({ gaps: g })), picks, solution, decoyIds };
}

/** A trap decoy: a subset of one ring's notches, part of no solution. */
function addTrapDecoy(random: RandomFn, teethRange: [number, number], gaps: number[], drafts: DraftPick[], key: string): void {
  for (let attempt = 0; attempt < MAX_DECOY_ATTEMPTS; attempt++) {
    const ring = randomInt(random, 0, gaps.length - 1);
    const ringPositions = positionsFromMask(gaps[ring]);
    const size = Math.min(ringPositions.length - 1, randomInt(random, teethRange[0], teethRange[1]));
    if (size < 2) continue;
    const absolute = maskFromPositions(shuffle(random, ringPositions).slice(0, size));
    const { teeth } = hideRotation(random, absolute);
    const candidate: DraftPick = { key, teeth };
    const all = [...drafts, candidate];
    const probe: Lock = {
      seed: '',
      level: 'novice',
      rings: gaps.map((g) => ({ gaps: g })),
      picks: all.map((d) => ({ id: d.key, teeth: d.teeth })),
      solution: [],
      decoyIds: [],
    };
    if (solve(probe, { requirePickId: candidate.key }).count === 0) {
      drafts.push(candidate);
      return;
    }
  }
}

/** A useless decoy: fits in no ring, whatever its rotation. */
function addUselessDecoy(random: RandomFn, config: LockLevelConfig, gaps: number[], drafts: DraftPick[], index: number): void {
  for (let attempt = 0; attempt < MAX_DECOY_ATTEMPTS; attempt++) {
    const size = randomInt(random, Math.max(2, config.teethPerPick[0]), config.teethPerPick[1]);
    const teeth = maskFromPositions(shuffle(random, ALL_POSITIONS).slice(0, size));
    if (!fitsAnyRing(teeth, gaps)) {
      drafts.push({ key: `useless-${index}`, teeth });
      return;
    }
  }
}

export function generateLock(seed: string, level: LockLevel, hardening?: LockHardening): Lock {
  const config = LOCK_LEVELS[level];
  // The level is part of the seed: one seed gives a different lock per level, but always the
  // same lock for a given (seed, level) pair.
  const random = createRandom(`${seed}:${level}`);
  const { gaps, picks } = buildSolution(random, config);
  const drafts = [...picks];
  for (let i = 0; i < config.trapDecoys; i++) addTrapDecoy(random, config.teethPerPick, gaps, drafts, `trap-${i}`);
  for (let i = 0; i < config.uselessDecoys; i++) addUselessDecoy(random, config, gaps, drafts, i);
  // After the level's own decoys: without hardening, the lock stays identical for the seed.
  for (let i = 0; i < (hardening?.extraTraps ?? 0); i++) addTrapDecoy(random, hardening!.trapTeeth, gaps, drafts, `extra-trap-${i}`);
  return toLock(seed, level, gaps, drafts, random);
}
