/**
 * Single page with two phases:
 * - the challenge (DC, bonus, d20 → coloured result frame);
 * - the lock, once "Pick the lock" is pressed: the challenge hides and only the lock remains, with
 *   its sound and vibration buttons and a "New challenge" button to go back.
 * Settings (direct level, seed, shared link…) and the help live in dialogs.
 *
 * URL parameters `?seed=abc123&level=expert` open a precise lock straight away: the GM can send
 * the same link to every player.
 */
import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
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
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import MobileOffRoundedIcon from '@mui/icons-material/MobileOffRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import VibrationRoundedIcon from '@mui/icons-material/VibrationRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import {
  LOCK_LEVEL_ORDER,
  LOCK_LEVEL_ROLL_RANGES,
  POOR_ROLL_HARDENING,
  generateLock,
  newSeed,
  type GameSetup,
  type LockLevel,
} from './engine';
import { useI18n, type Lang } from './i18n';
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
  aid: boolean;
  foundHints: boolean;
  hardened: boolean;
}

const PLAIN = { aid: false, foundHints: true, hardened: false };

/** A shared link opens its lock directly; otherwise we start with the challenge. */
function initialState(): { game: Game; playing: boolean } {
  const params = new URLSearchParams(window.location.search);
  const seed = params.get('seed');
  const level = params.get('level');
  return {
    game: { seed: seed || newSeed(), level: isLevel(level) ? level : 'advanced', ...PLAIN },
    playing: !!seed,
  };
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const [initial] = useState(initialState);
  const [game, setGame] = useState<Game>(initial.game);
  const [playing, setPlaying] = useState(initial.playing);
  const [round, setRound] = useState(0);
  const [challengeRound, setChallengeRound] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [seedDraft, setSeedDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = usePersistedBoolean(STORAGE_KEYS.soundMuted, false);
  const [vibrationOff, setVibrationOff] = usePersistedBoolean(STORAGE_KEYS.vibrationOff, false);
  const [highlightFits, setHighlightFits] = usePersistedBoolean(STORAGE_KEYS.highlightFits, false);
  const [houseTiers, setHouseTiers] = usePersistedBoolean(STORAGE_KEYS.houseTiers, true);
  const [vibrationSupported] = useState(canVibrate);

  const lock = useMemo(
    () => generateLock(game.seed, game.level, game.hardened ? POOR_ROLL_HARDENING : undefined),
    [game.seed, game.level, game.hardened],
  );

  // While playing, the URL describes the lock on screen, ready to be shared.
  useEffect(() => {
    const query = playing ? `?${new URLSearchParams({ seed: game.seed, level: game.level }).toString()}` : '';
    window.history.replaceState(null, '', `${window.location.pathname}${query}`);
  }, [playing, game.seed, game.level]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.appTitle;
  }, [lang, t.appTitle]);

  /** A lock chosen in the settings: no roll effect. */
  const playPlain = (patch: Partial<Pick<Game, 'seed' | 'level'>>) => {
    setSeedDraft(null);
    setGame((g) => ({ ...g, ...patch, ...PLAIN }));
    setPlaying(true);
  };

  const startChallenge = (setup: GameSetup) => {
    setSeedDraft(null);
    setGame({ seed: newSeed(), ...setup });
    setPlaying(true);
    window.scrollTo({ top: 0 });
  };

  const newChallenge = () => {
    setChallengeRound((r) => r + 1);
    setPlaying(false);
  };

  const draft = seedDraft ?? game.seed;
  const iconSx = { color: COLORS.steel };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <Box sx={{ color: COLORS.brassBright, display: 'flex' }}>
          <LockpicksIcon size={32} />
        </Box>
        <Typography variant="h4" component="h1" sx={{ flex: 1, fontWeight: 700, fontSize: { xs: '1.35rem', sm: '2rem' } }}>
          {t.appTitle}
        </Typography>
        <Tooltip title={t.help}>
          <IconButton aria-label={t.help} onClick={() => setHelpOpen(true)} data-testid="open-help">
            <HelpOutlineRoundedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t.settings}>
          <IconButton aria-label={t.settings} onClick={() => setSettingsOpen(true)} data-testid="open-settings">
            <TuneRoundedIcon />
          </IconButton>
        </Tooltip>
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
          <IconButton component="a" href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label={t.sourceCode} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            <GitHubIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Kept mounted while playing: the DC and bonus are still there for the next challenge. */}
      <Paper sx={{ p: 2, display: playing ? 'none' : 'block', maxWidth: 720, mx: 'auto' }} data-testid="challenge">
        <Typography variant="h6" component="h2" gutterBottom>
          {t.challengeTitle}
        </Typography>
        <ChallengeForm round={challengeRound} houseTiers={houseTiers} onHouseTiersChange={setHouseTiers} onStart={startChallenge} />
      </Paper>

      {playing && (
        <Paper sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: COLORS.background, backgroundImage: 'none' }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700, color: COLORS.gold, minWidth: 0 }} data-testid="board-title">
              {t.boardTitle(t.levels[game.level])}
              {game.aid ? t.flagAid : ''}
              {game.foundHints ? '' : t.flagNoHints}
              {game.hardened ? t.flagHardened : ''}
            </Typography>
            <Button size="small" onClick={newChallenge} data-testid="new-challenge">
              {t.newChallenge}
            </Button>
            {vibrationSupported && (
              <Tooltip title={vibrationOff ? t.vibrationOn : t.vibrationOff}>
                <IconButton aria-label={vibrationOff ? t.vibrationOn : t.vibrationOff} onClick={() => setVibrationOff(!vibrationOff)} sx={iconSx}>
                  {vibrationOff ? <MobileOffRoundedIcon /> : <VibrationRoundedIcon />}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={muted ? t.soundOn : t.soundOff}>
              <IconButton aria-label={muted ? t.soundOn : t.soundOff} onClick={() => setMuted(!muted)} sx={iconSx} data-testid="toggle-sound">
                {muted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
          <LockpickBoard
            key={`${game.seed}:${game.level}:${game.hardened}:${round}`}
            lock={lock}
            muted={muted}
            vibration={!vibrationOff}
            highlightFits={game.aid || highlightFits}
            foundHints={game.foundHints}
          />
        </Paper>
      )}

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t.settings}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t.settingsIntro}
          </Typography>
          <Stack spacing={2}>
            <TextField
              select
              size="small"
              label={t.levelLabel}
              value={game.level}
              onChange={(e) => playPlain({ level: e.target.value as LockLevel })}
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
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label={t.seedLabel}
                value={draft}
                onChange={(e) => setSeedDraft(e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft) playPlain({ seed: draft });
                }}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={() => draft && playPlain({ seed: draft })} disabled={!draft || (playing && draft === game.seed)}>
                {t.load}
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Button variant="contained" onClick={() => playPlain({ seed: newSeed() })}>
                {t.newLock}
              </Button>
              <Button
                onClick={() => {
                  setRound((r) => r + 1);
                  setPlaying(true);
                }}
              >
                {t.restart}
              </Button>
              <Button
                disabled={!playing}
                onClick={() => {
                  void navigator.clipboard?.writeText(window.location.href);
                  setCopied(true);
                }}
              >
                {t.copyLink}
              </Button>
            </Stack>
            <FormControlLabel control={<Switch checked={highlightFits} onChange={(e) => setHighlightFits(e.target.checked)} />} label={t.highlightFits} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>{t.close}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t.howTitle}</DialogTitle>
        <DialogContent>
          <Box component="ul" sx={{ mt: 0, pl: 2.5 }}>
            {t.how.map((line) => (
              <Typography component="li" variant="body2" key={line} sx={{ mb: 0.75 }}>
                {line}
              </Typography>
            ))}
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2 }}>
            {t.rulesTitle}
          </Typography>
          <Box component="ul" sx={{ mt: 0.5, pl: 2.5 }}>
            {t.rules.map((line) => (
              <Typography component="li" variant="body2" key={line} sx={{ mb: 0.75 }}>
                {line}
              </Typography>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2 }}>
            {t.credits}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button component="a" href={REPO_URL} target="_blank" rel="noopener noreferrer" startIcon={<GitHubIcon />}>
            GitHub
          </Button>
          <Button onClick={() => setHelpOpen(false)}>{t.close}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={copied} autoHideDuration={2500} onClose={() => setCopied(false)} message={t.linkCopied} />
    </Container>
  );
}
