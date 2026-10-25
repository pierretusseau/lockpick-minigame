import { describe, expect, it } from 'vitest';
import { decodeSharedLock, encodeSharedLock, rollBands, type SharedLock } from './share';

const lock: SharedLock = { seed: 'k7f2q9', dc: 20, tiers: true, timeLimit: 90, showTimer: false, bonus: 6, name: 'Coffre du baron — œil' };

describe('shared lock code', () => {
  it('round-trips, accents included', () => {
    expect(decodeSharedLock(encodeSharedLock(lock))).toEqual(lock);
    const plain = { ...lock, name: '', tiers: false, timeLimit: 0, showTimer: true, bonus: null };
    expect(decodeSharedLock(encodeSharedLock(plain))).toEqual(plain);
  });

  it('does not show the DC or the name in clear', () => {
    const code = encodeSharedLock(lock);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code).not.toContain('20');
    expect(code.toLowerCase()).not.toContain('baron');
  });

  it('reads links made before the timer and bonus options', () => {
    // Version 1 code without elements 6-7, as produced by the first GM mode.
    const legacy = btoaUrl(scrambleForTest(JSON.stringify([1, 'abc', 15, 1, 60, 'Porte'])));
    expect(decodeSharedLock(legacy)).toEqual({ seed: 'abc', dc: 15, tiers: true, timeLimit: 60, name: 'Porte', showTimer: true, bonus: null });
  });

  it('rejects damaged codes', () => {
    expect(decodeSharedLock('')).toBeNull();
    expect(decodeSharedLock('not-a-code')).toBeNull();
    expect(decodeSharedLock(encodeSharedLock(lock).slice(0, -4))).toBeNull();
  });
});

describe('roll bands', () => {
  it('covers 1 to 20 without gaps', () => {
    const bands = rollBands(20, 5, true);
    expect(bands[0].from).toBe(1);
    expect(bands[bands.length - 1].to).toBe(20);
    for (let i = 1; i < bands.length; i++) expect(bands[i].from).toBe(bands[i - 1].to + 1);
  });

  it('with tiers: 1 fumble, 20 open', () => {
    const bands = rollBands(15, 5, true);
    expect(bands[0]).toMatchObject({ from: 1, to: 1, result: 'fumble' });
    expect(bands[bands.length - 1]).toMatchObject({ to: 20, result: 'open' });
  });

  it('without tiers, a 1 is just a hard lock', () => {
    expect(rollBands(15, 5, false)[0].result).not.toBe('fumble');
  });
});

function scrambleForTest(text: string): Uint8Array {
  const key = [0x6c, 0x6f, 0x63, 0x6b, 0x70, 0x69, 0x63, 0x6b];
  return new TextEncoder().encode(text).map((b, i) => b ^ key[i % key.length]);
}

function btoaUrl(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
