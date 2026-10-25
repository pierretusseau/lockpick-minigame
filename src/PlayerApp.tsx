/**
 * Player view of a lock prepared by the GM (`?s=<code>`).
 *
 * The player only enters their bonus (possibly pre-filled by the GM) and d20. The DC stays hidden and
 * nothing tells how the roll changed the lock: no result frame, no level, no "good roll" flag. A
 * time limit may even be hidden: the timer then counts up and the attempt just ends. The attempt is remembered on the device for this link (roll, start
 * time, result): reopening the link gives back the same lock and the same running timer, so a
 * player cannot re-roll or reset the time limit by reloading.
 */
import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { POOR_ROLL_HARDENING, decodeSharedLock, generateLock, resolveChallenge, type GameSetup } from './engine';
import { formatDuration, formatLimit } from './format';
import { useI18n } from './i18n';
import { STORAGE_KEYS } from './storage';
import { AppHeader } from './components/AppHeader';
import { ChallengeForm } from './components/ChallengeForm';
import { LockpickBoard } from './components/LockpickBoard';
import { SoundButtons } from './components/SoundButtons';
import { useSoundPrefs } from './components/useSoundPrefs';
import { COLORS } from './components/theme';

interface Attempt {
  bonus: number;
  roll: number;
  /** Absent on a critical failure: no game. */
  setup?: GameSetup;
  /** The roll opened the lock without playing (the game is just for fun). */
  alreadyOpen: boolean;
  startedAt?: number;
  result?: { solved: boolean; ms: number };
}

function loadAttempt(code: string): Attempt | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.attempt(code)) ?? 'null');
    const a = parsed as Attempt | null;
    return a && typeof a.roll === 'number' && (a.result || (a.setup && typeof a.setup.level === 'string')) ? a : null;
  } catch {
    return null;
  }
}

function saveAttempt(code: string, attempt: Attempt): void {
  try {
    localStorage.setItem(STORAGE_KEYS.attempt(code), JSON.stringify(attempt));
  } catch {
    // Storage full or forbidden: the attempt simply won't survive a reload.
  }
}

export default function PlayerApp({ code }: { code: string }) {
  const { t } = useI18n();
  const shared = useMemo(() => decodeSharedLock(code), [code]);
  const prefs = useSoundPrefs();
  const [attempt, setAttemptState] = useState<Attempt | null>(() => loadAttempt(code));
  /** The attempt was already over when the page opened: show the report only. */
  const [finishedBefore] = useState(() => !!loadAttempt(code)?.result);

  const setAttempt = (next: Attempt) => {
    setAttemptState(next);
    saveAttempt(code, next);
  };

  const setup = attempt?.setup;
  const lock = useMemo(
    () => (shared && setup ? generateLock(shared.seed, setup.level, setup.hardened ? POOR_ROLL_HARDENING : undefined) : null),
    [shared, setup],
  );

  const title = shared?.name || t.playerLock;

  if (!shared) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <AppHeader title={t.appTitle} helpRules={false} />
        <Paper sx={{ p: 2 }}>
          <Typography data-testid="invalid-link">{t.invalidLink}</Typography>
        </Paper>
      </Container>
    );
  }

  const report = attempt?.result
    ? !attempt.setup
      ? t.reportFumble
      : attempt.result.solved
      ? t.reportSolved(formatDuration(attempt.result.ms))
      : t.reportTimeUp
    : attempt?.alreadyOpen
      ? t.reportOpen
      : null;
  const reportTone = attempt?.result && !attempt.result.solved ? COLORS.miss : COLORS.fit;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      <AppHeader title={title} helpRules={false} />

      {!attempt && (
        <Paper sx={{ p: 2, maxWidth: 720, mx: 'auto' }} data-testid="player-challenge">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t.playerIntro}
            {shared.timeLimit > 0 && shared.showTimer && (
              <Box component="span" sx={{ display: 'block', mt: 0.5, color: COLORS.gold }}>
                {t.timeLimitNote(formatLimit(shared.timeLimit))}
              </Box>
            )}
          </Typography>
          <ChallengeForm
            houseTiers={shared.tiers}
            secret={{
              initialBonus: shared.bonus,
              onSubmit: (bonus, roll) => {
                const r = resolveChallenge({ dc: shared.dc, bonus, roll, houseTiers: shared.tiers });
                setAttempt(
                  r.setup
                    ? { bonus, roll, setup: r.setup, alreadyOpen: r.alreadyOpen }
                    : { bonus, roll, alreadyOpen: false, result: { solved: false, ms: 0 } },
                );
              },
            }}
          />
        </Paper>
      )}

      {attempt && report && (
        <Box
          data-testid="player-report"
          sx={{ maxWidth: 720, mx: 'auto', mb: 2, px: 1.5, py: 1, borderRadius: 1, border: `1px solid ${reportTone}`, borderLeftWidth: 4, bgcolor: `${reportTone}1f` }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: reportTone }}>
            {report}
          </Typography>
          {finishedBefore && (
            <Typography variant="body2" color="text.secondary">
              {t.alreadyTried}
            </Typography>
          )}
        </Box>
      )}

      {attempt && lock && setup && !finishedBefore && (
        <Paper sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: COLORS.background, backgroundImage: 'none' }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700, color: COLORS.gold, minWidth: 0 }} data-testid="board-title">
              {title}
            </Typography>
            <SoundButtons prefs={prefs} />
          </Stack>
          <LockpickBoard
            lock={lock}
            muted={prefs.muted}
            vibration={!prefs.vibrationOff}
            highlightFits={setup.aid}
            foundHints={setup.foundHints}
            timeLimitMs={shared.timeLimit > 0 && !attempt.alreadyOpen ? shared.timeLimit * 1000 : undefined}
            showTimeLimit={shared.showTimer}
            startedAt={attempt.startedAt}
            onStart={(at) => setAttempt({ ...attempt, startedAt: at })}
            onSolved={(ms) => !attempt.alreadyOpen && setAttempt({ ...attempt, result: { solved: true, ms } })}
            onTimeout={() => setAttempt({ ...attempt, result: { solved: false, ms: shared.timeLimit * 1000 } })}
          />
        </Paper>
      )}
    </Container>
  );
}
