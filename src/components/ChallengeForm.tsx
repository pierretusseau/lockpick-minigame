/**
 * The challenge, kept to the minimum: DC set by the GM, the character's bonus, the d20 rolled at
 * the table — then the resulting lock in a coloured frame (see `resolveChallenge`). The maths are
 * explained in the help dialog, the d20 tiers in a tooltip.
 *
 * GM link (`secret`): the DC is hidden and there is NO result frame — the player must not know
 * whether the roll made the lock easier or harder. "Pick the lock" hands the bonus and d20 over.
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { resolveChallenge, type GameSetup, type RollOutcome } from '../engine';
import { useI18n } from '../i18n';
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

/** Typed integer, or `null` when the field is empty or invalid. */
function parseInteger(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export interface ChallengeFormProps {
  /** Bumped by "New challenge": the d20 field is cleared, the DC and bonus stay. */
  round?: number;
  houseTiers: boolean;
  /** Absent: the d20 tiers are fixed (GM link) and the switch is hidden. */
  onHouseTiersChange?: (value: boolean) => void;
  onStart?: (setup: GameSetup) => void;
  /** GM link: the DC is hidden, no result is shown; the bonus and d20 go straight to the caller. */
  secret?: { initialBonus: number | null; onSubmit: (bonus: number, roll: number) => void };
}

export function ChallengeForm({ round = 0, houseTiers, onHouseTiersChange, onStart, secret }: ChallengeFormProps) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<string>('15');
  const [customText, setCustomText] = useState('');
  const [bonusText, setBonusText] = useState(() => (secret?.initialBonus != null ? String(secret.initialBonus) : ''));
  const [rollText, setRollText] = useState('');
  const [seenRound, setSeenRound] = useState(round);
  if (round !== seenRound) {
    setSeenRound(round);
    setRollText('');
  }

  const dc = choice === CUSTOM ? parseInteger(customText) : Number(choice);
  const bonus = parseInteger(bonusText) ?? 0;
  const roll = parseInteger(rollText);
  const rollValid = roll !== null && roll >= 1 && roll <= 20;
  const result = dc !== null && rollValid ? resolveChallenge({ dc, bonus, roll, houseTiers }) : null;

  const levelLabel = result && result.level !== 'automatic' ? t.levels[result.level] : '';
  const title = !result
    ? null
    : result.outcome === 'fumble'
      ? t.result.fumble
      : result.outcome === 'critical'
        ? t.result.critical
        : result.level === 'automatic'
          ? t.result.automatic
          : result.outcome === 'poor'
            ? t.result.poor(levelLabel)
            : result.outcome === 'good'
              ? t.result.good(levelLabel)
              : t.result.level(levelLabel);
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
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
        {!secret && (
          <TextField select size="small" label={t.dcLabel} value={choice} onChange={(e) => setChoice(e.target.value)} sx={{ flex: '1 1 220px' }}>
            {DC_VALUES.map((value, i) => (
              <MenuItem key={value} value={String(value)}>
                {t.dcOptions[i]} ({value})
              </MenuItem>
            ))}
            <MenuItem value={CUSTOM}>{t.dcCustom}</MenuItem>
          </TextField>
        )}
        {!secret && choice === CUSTOM && (
          <TextField
            size="small"
            type="number"
            label={t.dcShort}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            sx={{ width: 110 }}
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
          sx={{ width: 120 }}
          slotProps={{ htmlInput: { 'data-testid': 'challenge-bonus' } }}
        />
        <TextField
          size="small"
          type="number"
          label={t.rollLabel}
          value={rollText}
          onChange={(e) => setRollText(e.target.value)}
          error={rollText !== '' && !rollValid}
          helperText={rollText !== '' && !rollValid ? t.rollError : undefined}
          sx={{ width: 120 }}
          slotProps={{ htmlInput: { min: 1, max: 20, 'data-testid': 'challenge-roll' } }}
        />
      </Stack>

      {onHouseTiersChange && (
        <Tooltip
          placement="right"
          title={
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {t.tiersHelp.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </Box>
          }
        >
          <FormControlLabel
            sx={{ alignSelf: 'flex-start', mt: '8px !important' }}
            control={<Switch size="small" checked={houseTiers} onChange={(e) => onHouseTiersChange(e.target.checked)} />}
            label={<Typography variant="body2">{t.tiersLabel}</Typography>}
            data-testid="tiers-switch"
          />
        </Tooltip>
      )}

      {secret ? (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained" disabled={!rollValid} onClick={() => secret.onSubmit(bonus, roll!)} data-testid="challenge-start">
            {t.startButton}
          </Button>
        </Stack>
      ) : result && tone && title ? (
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

      {!secret && onStart && result?.setup && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={() => onStart(result.setup!)} data-testid="challenge-start">
            {result.alreadyOpen ? t.playForFun : t.startButton}
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
