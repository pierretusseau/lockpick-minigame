/**
 * SEEDED pseudo-random numbers.
 *
 * Same seed ⇒ same sequence ⇒ same lock: the GM can share a seed so that every player gets
 * the very same lock, and a bug can be reproduced. The seed is a short readable string
 * (base 36), hashed into a 32-bit integer and fed to mulberry32.
 */

export type RandomFn = () => number;

/** Hashes a string into an unsigned 32-bit integer (FNV-1a). */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 generator: fast, 32-bit, plenty for a puzzle. */
export function createRandom(seed: string): RandomFn {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform integer in [min, max] (both included). */
export function randomInt(random: RandomFn, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** Fisher-Yates shuffle, on a copy. */
export function shuffle<T>(random: RandomFn, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const SEED_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** New random 6-character seed (uses Math.random, outside of any seeded draw). */
export function newSeed(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) out += SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)];
  return out;
}
