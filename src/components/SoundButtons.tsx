/** Sound and vibration toggles, shown in the lock's header (vibrations only where supported). */
import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MobileOffRoundedIcon from '@mui/icons-material/MobileOffRounded';
import VibrationRoundedIcon from '@mui/icons-material/VibrationRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import { useI18n } from '../i18n';
import type { useSoundPrefs } from './useSoundPrefs';
import { canVibrate } from './sound';
import { COLORS } from './theme';

export function SoundButtons({ prefs }: { prefs: ReturnType<typeof useSoundPrefs> }) {
  const { t } = useI18n();
  const [vibrationSupported] = useState(canVibrate);
  const { muted, setMuted, vibrationOff, setVibrationOff } = prefs;
  const sx = { color: COLORS.steel };
  return (
    <>
      {vibrationSupported && (
        <Tooltip title={vibrationOff ? t.vibrationOn : t.vibrationOff}>
          <IconButton aria-label={vibrationOff ? t.vibrationOn : t.vibrationOff} onClick={() => setVibrationOff(!vibrationOff)} sx={sx}>
            {vibrationOff ? <MobileOffRoundedIcon /> : <VibrationRoundedIcon />}
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={muted ? t.soundOn : t.soundOff}>
        <IconButton aria-label={muted ? t.soundOn : t.soundOff} onClick={() => setMuted(!muted)} sx={sx} data-testid="toggle-sound">
          {muted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
        </IconButton>
      </Tooltip>
    </>
  );
}
