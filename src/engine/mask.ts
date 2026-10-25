/** Operations on the 32-bit masks of rings and picks (see `types.ts`). */
import { POSITIONS } from './types';

/** Rotates a mask by `rotation` steps towards increasing positions. */
export function rotateMask(mask: number, rotation: number): number {
  const r = ((rotation % POSITIONS) + POSITIONS) % POSITIONS;
  if (r === 0) return mask >>> 0;
  return ((mask << r) | (mask >>> (POSITIONS - r))) >>> 0;
}

export function maskFromPositions(positions: readonly number[]): number {
  let mask = 0;
  for (const p of positions) mask |= 1 << (((p % POSITIONS) + POSITIONS) % POSITIONS);
  return mask >>> 0;
}

export function positionsFromMask(mask: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < POSITIONS; i++) if ((mask >>> i) & 1) out.push(i);
  return out;
}

export function popCount(mask: number): number {
  let m = mask >>> 0;
  let count = 0;
  while (m) {
    m &= m - 1;
    count++;
  }
  return count;
}

/** Is `inner` fully contained in `outer`? */
export function isSubset(inner: number, outer: number): boolean {
  return ((inner & ~outer) >>> 0) === 0;
}

/** DISTINCT rotations of a mask (a symmetric pattern has fewer than 32). */
export function distinctRotations(mask: number): { rotation: number; mask: number }[] {
  const seen = new Set<number>();
  const out: { rotation: number; mask: number }[] = [];
  for (let r = 0; r < POSITIONS; r++) {
    const m = rotateMask(mask, r);
    if (seen.has(m)) continue;
    seen.add(m);
    out.push({ rotation: r, mask: m });
  }
  return out;
}

/** Lowest set bit (lowest free slot), or -1 for an empty mask. */
export function lowestBit(mask: number): number {
  const m = mask >>> 0;
  if (m === 0) return -1;
  return 31 - Math.clz32(m & -m);
}
