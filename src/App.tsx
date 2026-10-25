/**
 * Single page, in three blocks: the challenge (DC, bonus, d20 → lock), the settings (direct level,
 * seed, sounds…) and the lock itself.
 *
 * URL parameters `?seed=abc123&level=expert&kind=trap` reopen a precise lock: the GM can send the
 * same link to every player.
 */
import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import GitHubIcon from '@mui/icons-material/GitHub';
import {
  LOCK_LEVEL_ORDER,
  LOCK_LEVEL_ROLL_RANGES,
  POOR_ROLL_HARDENING,
  generateLock,
  newSeed,
  type GameSetup,
  type LockLevel,
} from './engine';
import { useI18n, type Kind, type Lang } from './i18n';
import { STORAGE_KEYS, usePersistedBoolean } from './storage';
import { ChallengeForm } from './components/ChallengeForm';
import { LockpickBoard } from './components/LockpickBoard';
import { LockpicksIcon } from './components/LockpicksIcon';
import { canVibrate } from './components/sound';
import { COLORS } from './components/theme';

export const REPO_URL = 'https://github.com/pierretusseau/lockpick-minigame';

function isLevel(value: string | null): value is LockLevel {
  return !!value && (LOCK_LEVEL_ORDER as string[]).includes(value);
}

interface Game {
  seed: string;
  level: LockLevel;
  kind: Kind;
  aid: boolean;
  foundHints: boolean;
  hardened: boolean;
}

function gameFromUrl(): Game {
  const params = new URLSearchParams(window.location.search);
  const level = params.get('level');
  return {
    seed: params.get('seed') || newSeed(),
    level: isLevel(level) ? level : 'advanced',
    kind: params.get('kind') === 'trap' ? 'trap' : 'lock',
    aid: false,
    foundHints: true,
    hardened: false,
  };
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [game, setGame] = useState<Game>(gameFromUrl);
  const [round, setRound] = useState(0);
  const [seedDraft, setSeedDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = usePersistedBoolean(STORAGE_KEYS.soundMuted, false);
  const [vibrationOff, setVibrationOff] = usePersistedBoolean(STORAGE_KEYS.vibrationOff, false);
  const [highlightFits, setHighlightFits] = usePersistedBoolean(STORAGE_KEYS.highlightFits, false);
  const [houseTiers, setHouseTiers] = usePersistedBoolean(STORAGE_KEYS.houseTiers, false);
  const [vibrationSupported] = useState(canVibrate);

  const lock = useMemo(
    () => generateLock(game.seed, game.level, game.hardened ? POOR_ROLL_HARDENING : undefined),
    [game.seed, game.level, game.hardened],
  );

  // The URL always describes the lock on screen, ready to be shared.
  useEffect(() => {
    const params = new URLSearchParams({ seed: game.seed, level: game.level });
    if (game.kind === 'trap') params.set('kind', 'trap');
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [game.seed, game.level, game.kind]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.appTitle;
  }, [lang, t.appTitle]);

  /** A lock chosen directly in the settings: no roll effect. */
  const setPlain = (patch: Partial<Pick<Game, 'seed' | 'level'>>) => {
    setSeedDraft(null);
    setGame((g) => ({ ...g, ...patch, aid: false, foundHints: true, hardened: false }));
  };

  const startChallenge = (setup: GameSetup) => {
    setSeedDraft(null);
    setGame((g) => ({ ...g, seed: newSeed(), ...setup }));
    window.setTimeout(() => document.getElementById('board')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const draft = seedDraft ?? game.seed;
  const levelName = t.levels[game.level];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <Box sx={{ color: COLORS.brassBright, display: 'flex' }}>
          <LockpicksIcon size={36} />
        </Box>
        <Typography variant="h4" component="h1" sx={{ flex: 1, fontWeight: 700, fontSize: { xs: '1.6rem', sm: '2.125rem' } }}>
          {t.appTitle}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={lang}
          onChange={(_, value: Lang | null) => value && setLang(value)}
          aria-label={t.languageLabel}
        >
          <ToggleButton value="en">EN</ToggleButton>
          <ToggleButton value="fr">FR</ToggleButton>
        </ToggleButtonGroup>
        <Tooltip title={t.sourceCode}>
          <IconButton component="a" href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label={t.sourceCode}>
            <GitHubIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t.intro}
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {t.challengeTitle}
        </Typography>
        <ChallengeForm
          kind={game.kind}
          onKindChange={(kind) => setGame((g) => ({ ...g, kind }))}
          houseTiers={houseTiers}
          onHouseTiersChange={setHouseTiers}
          onStart={startChallenge}
        />
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
          {t.settingsTitle}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap', rowGap: 1.5 }}>
          <TextField
            select
            size="small"
            label={t.levelLabel}
            value={game.level}
            onChange={(e) => setPlain({ level: e.target.value as LockLevel })}
            sx={{ minWidth: 240 }}
            slotProps={{ htmlInput: { 'data-testid': 'level-select' } }}
          >
            {LOCK_LEVEL_ORDER.map((l) => (
              <MenuItem key={l} value={l}>
                {t.levels[l]}
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  ({t.gapRange(LOCK_LEVEL_ROLL_RANGES[l].min, LOCK_LEVEL_ROLL_RANGES[l].max)})
                </Typography>
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label={t.seedLabel}
            value={draft}
            onChange={(e) => setSeedDraft(e.target.value.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft) setPlain({ seed: draft });
            }}
            sx={{ width: 140 }}
          />
          <Button variant="outlined" onClick={() => draft && setPlain({ seed: draft })} disabled={!draft || draft === game.seed}>
            {t.load}
          </Button>
          <Button variant="contained" onClick={() => setPlain({ seed: newSeed() })}>
            {t.newLock}
          </Button>
          <Button onClick={() => setRound((r) => r + 1)}>{t.restart}</Button>
          <Button
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href);
              setCopied(true);
            }}
          >
            {t.copyLink}
          </Button>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
          <FormControlLabel control={<Switch checked={highlightFits} onChange={(e) => setHighlightFits(e.target.checked)} />} label={t.highlightFits} />
          <FormControlLabel control={<Switch checked={!muted} onChange={(e) => setMuted(!e.target.checked)} />} label={t.sounds} />
          {vibrationSupported && (
            <FormControlLabel control={<Switch checked={!vibrationOff} onChange={(e) => setVibrationOff(!e.target.checked)} />} label={t.vibrations} />
          )}
        </Stack>
      </Paper>

      <Paper id="board" sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: COLORS.background, backgroundImage: 'none', scrollMarginTop: 8 }}>
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700, color: COLORS.gold }} data-testid="board-title">
          {t.boardTitle[game.kind](levelName)}
          {game.aid ? t.flagAid : ''}
          {game.foundHints ? '' : t.flagNoHints}
          {game.hardened ? t.flagHardened : ''}
        </Typography>
        <LockpickBoard
          key={`${game.seed}:${game.level}:${game.hardened}:${round}`}
          lock={lock}
          kind={game.kind}
          muted={muted}
          vibration={!vibrationOff}
          highlightFits={game.aid || highlightFits}
          foundHints={game.foundHints}
        />
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
          {t.howTitle}
        </Typography>
        <Box component="ul" sx={{ mt: 0.5, pl: 3, color: 'text.secondary' }}>
          {t.how.map((line) => (
            <Typography component="li" variant="body2" key={line}>
              {line}
            </Typography>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2 }}>
          {t.credits}{' '}
          <Link href={REPO_URL} target="_blank" rel="noopener noreferrer">
            GitHub
          </Link>
        </Typography>
      </Box>

      <Snackbar open={copied} autoHideDuration={2500} onClose={() => setCopied(false)} message={t.linkCopied} />
    </Container>
  );
}
