/**
 * The challenge, in this order: lock or trap, DC set by the GM, the character's bonus, the d20
 * rolled at the table — and only then the resulting lock (see `resolveChallenge`).
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { resolveChallenge, type GameSetup, type RollOutcome } from '../engine';
import { useI18n, type Kind } from '../i18n';
import { COLORS } from './theme';

/** Standard DC ladder (very easy → nearly impossible). */
const DC_VALUES = [5, 10, 15, 20, 25, 30];
const CUSTOM = 'custom';

/** Result frame colour, matching the game (yellow = found positions, green = help). */
const ROLL_TONES: Record<RollOutcome, string> = {
  fumble: '#e2685c',
  poor: '#f0a04b',
  normal: COLORS.found,
  good: '#bfdc52',
  critical: COLORS.fit,
};

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Typed integer, or `null` when the field is empty or invalid. */
function parseInteger(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export interface ChallengeFormProps {
  kind: Kind;
  onKindChange: (kind: Kind) => void;
  houseTiers: boolean;
  onHouseTiersChange: (value: boolean) => void;
  onStart: (setup: GameSetup) => void;
}

export function ChallengeForm({ kind, onKindChange, houseTiers, onHouseTiersChange, onStart }: ChallengeFormProps) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<string>('15');
  const [customText, setCustomText] = useState('');
  const [bonusText, setBonusText] = useState('5');
  const [rollText, setRollText] = useState('');

  const dc = choice === CUSTOM ? parseInteger(customText) : Number(choice);
  const bonus = parseInteger(bonusText) ?? 0;
  const roll = parseInteger(rollText);
  const rollValid = roll !== null && roll >= 1 && roll <= 20;
  const result = dc !== null && rollValid ? resolveChallenge({ dc, bonus, roll, houseTiers }) : null;

  const levelLabel = result && result.level !== 'automatic' ? t.levels[result.level] : '';
  const texts = t.result[kind];
  const title = !result
    ? null
    : result.outcome === 'fumble'
      ? texts.fumble
      : result.outcome === 'critical'
        ? texts.critical
        : result.level === 'automatic'
          ? texts.automatic
          : result.outcome === 'poor'
            ? texts.poor(levelLabel)
            : result.outcome === 'good'
              ? texts.good(levelLabel)
              : texts.level(levelLabel);
  const text = !result
    ? null
    : result.outcome === 'fumble'
      ? t.resultText.fumble
      : result.alreadyOpen
        ? t.resultText.alreadyOpen
        : t.resultText[result.outcome === 'critical' ? 'normal' : result.outcome];
  const tone = result ? ROLL_TONES[result.outcome] : null;

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={kind}
        onChange={(_, value: Kind | null) => value && onKindChange(value)}
        sx={{ alignSelf: 'flex-start' }}
      >
        <ToggleButton value="lock">{t.kindLabel.lock}</ToggleButton>
        <ToggleButton value="trap">{t.kindLabel.trap}</ToggleButton>
      </ToggleButtonGroup>

      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
        <TextField select size="small" label={t.dcLabel} value={choice} onChange={(e) => setChoice(e.target.value)} sx={{ flex: '1 1 220px' }}>
          {DC_VALUES.map((value, i) => (
            <MenuItem key={value} value={String(value)}>
              {t.dcOptions[i]} ({value})
            </MenuItem>
          ))}
          <MenuItem value={CUSTOM}>{t.dcCustom}</MenuItem>
        </TextField>
        {choice === CUSTOM && (
          <TextField
            size="small"
            type="number"
            label={t.dcShort}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            sx={{ width: 100 }}
            slotProps={{ htmlInput: { min: 0, max: 60 } }}
            autoFocus
          />
        )}
        <TextField
          size="small"
          type="number"
          label={t.bonusLabel}
          value={bonusText}
          onChange={(e) => setBonusText(e.target.value)}
          helperText={t.bonusHelp}
          sx={{ width: 160 }}
          slotProps={{ htmlInput: { 'data-testid': 'challenge-bonus' } }}
        />
        <TextField
          size="small"
          type="number"
          label={t.rollLabel}
          value={rollText}
          onChange={(e) => setRollText(e.target.value)}
          error={rollText !== '' && !rollValid}
          helperText={rollText !== '' && !rollValid ? t.rollError : t.rollHelp}
          sx={{ width: 220 }}
          slotProps={{ htmlInput: { min: 1, max: 20, 'data-testid': 'challenge-roll' } }}
        />
      </Stack>

      <Box>
        <FormControlLabel
          control={<Switch size="small" checked={houseTiers} onChange={(e) => onHouseTiersChange(e.target.checked)} />}
          label={<Typography variant="body2">{t.tiersLabel}</Typography>}
        />
        {houseTiers && (
          <Typography variant="caption" color="text.secondary" component="div">
            {t.tiersHelp}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
          {t.rollExplain}
        </Typography>
      </Box>

      {dc !== null && (
        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }} data-testid="challenge-breakdown">
          <Typography variant="body2">{t.breakdownBase(dc, signed(bonus), dc - bonus)}</Typography>
          {result && result.outcome !== 'fumble' && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {t.breakdownRoll(roll!, result.rollShift, result.gap)}
            </Typography>
          )}
        </Box>
      )}

      {result && tone && title ? (
        <Box
          data-testid="challenge-result"
          data-outcome={result.outcome}
          sx={{ px: 1.5, py: 1, borderRadius: 1, border: `1px solid ${tone}`, borderLeftWidth: 4, bgcolor: `${tone}1f` }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tone }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {text}
          </Typography>
        </Box>
      ) : (
        <Typography data-testid="challenge-result" variant="body2" color="text.secondary">
          {dc === null ? t.waitingDc : t.waitingRoll}
        </Typography>
      )}

      {result?.setup && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={() => onStart(result.setup!)} data-testid="challenge-start">
            {result.alreadyOpen ? t.playForFun : t.startButton[kind]}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
