/**
 * GM mode: a lock prepared by the GM travels to the players inside the link, as an opaque code.
 *
 * The site has no server, so the code carries everything: seed, DC, d20 tiers, time limit (shown
 * or not), the player's bonus if the GM knows it, and the lock's name. It is scrambled (XOR +
 * base64url) so that the DC is not readable in the address bar.
 * This is NOT security — a curious player could decode it from the source code — just enough to
 * keep the difficulty out of sight at the table.
 */
import { resolveChallenge, type RollOutcome } from './challenge';
import type { LockLevel } from './types';

export interface SharedLock {
  seed: string;
  /** Difficulty Class set by the GM. */
  dc: number;
  /** House rule: special effects of the raw d20. */
  tiers: boolean;
  /** Time limit in seconds, 0 = none. */
  timeLimit: number;
  /** The player sees the time left. Off: the limit is a surprise (a plain timer counts up). */
  showTimer: boolean;
  /** Player's bonus entered by the GM, pre-filled for the player; `null` = the player enters it. */
  bonus: number | null;
  /** Name shown to the player ("Crypt door"), may be empty. */
  name: string;
}

const VERSION = 1;
const KEY = [0x6c, 0x6f, 0x63, 0x6b, 0x70, 0x69, 0x63, 0x6b]; // "lockpick"
const MAX_NAME = 60;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function scramble(bytes: Uint8Array): Uint8Array {
  return bytes.map((b, i) => b ^ KEY[i % KEY.length]);
}

export function encodeSharedLock(lock: SharedLock): string {
  const payload = [VERSION, lock.seed, lock.dc, lock.tiers ? 1 : 0, lock.timeLimit, lock.name.slice(0, MAX_NAME), lock.showTimer ? 1 : 0, lock.bonus];
  return toBase64Url(scramble(new TextEncoder().encode(JSON.stringify(payload))));
}

/** The shared lock, or `null` for a damaged or unknown code. */
export function decodeSharedLock(code: string): SharedLock | null {
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(scramble(fromBase64Url(code))));
    if (!Array.isArray(data) || data[0] !== VERSION) return null;
    // Elements 6-7 came later: older links have neither (timer shown, no bonus).
    const [, seed, dc, tiers, timeLimit, name, showTimer, bonus] = data;
    if (typeof seed !== 'string' || !seed || typeof dc !== 'number' || !Number.isFinite(dc)) return null;
    if (typeof timeLimit !== 'number' || timeLimit < 0 || typeof name !== 'string') return null;
    return {
      seed,
      dc,
      tiers: tiers === 1,
      timeLimit,
      name,
      showTimer: showTimer !== 0,
      bonus: typeof bonus === 'number' && Number.isFinite(bonus) ? bonus : null,
    };
  } catch {
    return null;
  }
}

/** One line of the GM's preview: for these d20 results, this lock. */
export interface RollBand {
  from: number;
  to: number;
  /** 'open' = automatic or critical success, 'fumble' = no game. */
  result: LockLevel | 'open' | 'fumble';
  outcome: RollOutcome;
}

/** What each d20 gives, for a DC and a player's bonus, grouped into bands of equal results. */
export function rollBands(dc: number, bonus: number, tiers: boolean): RollBand[] {
  const bands: RollBand[] = [];
  for (let roll = 1; roll <= 20; roll++) {
    const r = resolveChallenge({ dc, bonus, roll, houseTiers: tiers });
    const result: RollBand['result'] = r.outcome === 'fumble' ? 'fumble' : r.alreadyOpen ? 'open' : (r.level as LockLevel);
    const last = bands[bands.length - 1];
    if (last && last.result === result && last.outcome === r.outcome) last.to = roll;
    else bands.push({ from: roll, to: roll, result, outcome: r.outcome });
  }
  return bands;
}
