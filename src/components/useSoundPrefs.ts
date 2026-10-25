import { STORAGE_KEYS, usePersistedBoolean } from '../storage';

/** Saved sound and vibration preferences. */
export function useSoundPrefs() {
  const [muted, setMuted] = usePersistedBoolean(STORAGE_KEYS.soundMuted, false);
  const [vibrationOff, setVibrationOff] = usePersistedBoolean(STORAGE_KEYS.vibrationOff, false);
  return { muted, setMuted, vibrationOff, setVibrationOff };
}
