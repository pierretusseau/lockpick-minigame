/** localStorage keys and a small persisted-boolean hook. */
import { useState } from 'react';

const PREFIX = 'lockpick-minigame:';

export const STORAGE_KEYS = {
  lang: `${PREFIX}lang`,
  soundMuted: `${PREFIX}sound-muted`,
  vibrationOff: `${PREFIX}vibration-off`,
  highlightFits: `${PREFIX}highlight-fits`,
  houseTiers: `${PREFIX}house-tiers`,
  /** GM mode: the GM's named locks. */
  gmLocks: `${PREFIX}gm-locks`,
  /** Player of a GM link: the attempt made with this code (roll, start time, result). */
  attempt: (code: string) => `${PREFIX}attempt:${code}`,
  /** Leaderboard: random id of this browser (never shown) and the player's name. */
  playerId: `${PREFIX}player-id`,
  playerName: `${PREFIX}player-name`,
} as const;

/** Boolean state saved in localStorage: the player's choice survives a reload. */
export function usePersistedBoolean(key: string, defaultValue: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved === 'true' ? true : saved === 'false' ? false : defaultValue;
  });
  const set = (next: boolean) => {
    setValue(next);
    localStorage.setItem(key, String(next));
  };
  return [value, set];
}
