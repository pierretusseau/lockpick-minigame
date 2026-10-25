/** localStorage keys and a small persisted-boolean hook. */
import { useState } from 'react';

const PREFIX = 'lockpick-minigame:';

export const STORAGE_KEYS = {
  lang: `${PREFIX}lang`,
  soundMuted: `${PREFIX}sound-muted`,
  vibrationOff: `${PREFIX}vibration-off`,
  highlightFits: `${PREFIX}highlight-fits`,
  houseTiers: `${PREFIX}house-tiers`,
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
