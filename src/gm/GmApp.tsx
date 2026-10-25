/**
 * GM mode (`/mj/`): configuration only, no game. The GM prepares named locks (DC, optional
 * player's bonus, time limit shown or hidden, d20 tiers) and shares each one as a link or a QR
 * code. Players opening the link never see the DC, the lock's level, nor how their roll changed it.
 *
 * Locks are kept in this browser's localStorage. The link carries the whole lock, so deleting a
 * lock here does not break links already sent.
 */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import { encodeSharedLock, newSeed, rollBands, type RollOutcome } from '../engine';
import { formatLimit } from '../format';
import { useI18n } from '../i18n';
import { STORAGE_KEYS } from '../storage';
import { AppHeader } from '../components/AppHeader';
import { COLORS } from '../components/theme';

interface GmLock {
  id: string;
  name: string;
  dc: number;
  tiers: boolean;
  /** Seconds, 0 = none. */
  timeLimit: number;
  /** The player sees the time left (absent on locks saved before the option: shown). */
  showTimer?: boolean;
  /** Player's bonus, pre-filled for the player; `null` = entered by the player. */
  bonus?: number | null;
  seed: string;
  createdAt: number;
}

const DC_VALUES = [5, 10, 15, 20, 25, 30];
const TIME_LIMITS = [0, 30, 60, 120, 180, 300];
const CUSTOM = 'custom';
const DEFAULT_ASSUMED_BONUS = 5;

const TONES: Record<RollOutcome, string> = {
  fumble: '#e2685c',
  poor: '#f0a04b',
  normal: COLORS.found,
  good: '#bfdc52',
  critical: COLORS.fit,
};

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function parseInteger(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function loadLocks(): GmLock[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.gmLocks) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((l): l is GmLock => !!l && typeof l.id === 'string' && typeof l.dc === 'number') : [];
  } catch {
    return [];
  }
}

/** Link opened by the players: the main page, with the lock's code. */
function playerLink(lock: GmLock): string {
  const code = encodeSharedLock({
    seed: lock.seed,
    dc: lock.dc,
    tiers: lock.tiers,
    timeLimit: lock.timeLimit,
    showTimer: lock.showTimer ?? true,
    bonus: lock.bonus ?? null,
    name: lock.name,
  });
  return new URL(`../?s=${code}`, window.location.href).toString();
}

function QrDialog({ lock, onClose, onCopy }: { lock: GmLock | null; onClose: () => void; onCopy: (link: string) => void }) {
  const { t } = useI18n();
  const link = lock ? playerLink(lock) : '';
  const [svg, setSvg] = useState('');
  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    void QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then((markup) => {
      if (!cancelled) setSvg(markup);
    });
    return () => {
      cancelled = true;
    };
  }, [link]);
  return (
    <Dialog open={!!lock} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{lock?.name || t.untitled}</DialogTitle>
      <DialogContent>
        <Box
          data-testid="qr-code"
          sx={{ bgcolor: '#fff', borderRadius: 1, p: 1.5, mx: 'auto', maxWidth: 320, '& svg': { display: 'block', width: '100%', height: 'auto' } }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: 'center' }}>
          {t.qrHelp}
        </Typography>
        <Typography variant="caption" component="p" sx={{ mt: 1, wordBreak: 'break-all', color: 'text.secondary' }} data-testid="qr-link">
          {link}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<ContentCopyRoundedIcon />} onClick={() => onCopy(link)}>
          {t.copyLink}
        </Button>
        <Button onClick={onClose}>{t.close}</Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * What each d20 gives: a two-column table "d20 → lock". With a known player's bonus it is used;
 * otherwise the GM can try an assumed bonus (preview only, never saved).
 */
function RollPreview({ dc, tiers, bonus }: { dc: number; tiers: boolean; bonus: number | null }) {
  const { t } = useI18n();
  const [assumedText, setAssumedText] = useState(String(DEFAULT_ASSUMED_BONUS));
  const used = bonus ?? parseInteger(assumedText) ?? 0;
  const bands = rollBands(dc, used, tiers);
  return (
    <Box data-testid="roll-preview">
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t.previewTitle}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
        {t.previewExplain(signed(used))}
      </Typography>
      {bonus === null && (
        <TextField
          size="small"
          type="number"
          label={t.assumedBonus}
          helperText={t.assumedHelp}
          value={assumedText}
          onChange={(e) => setAssumedText(e.target.value)}
          sx={{ width: 300, mb: 1 }}
          slotProps={{ htmlInput: { 'data-testid': 'gm-assumed-bonus' } }}
        />
      )}
      <Box
        component="table"
        sx={{
          borderCollapse: 'collapse',
          fontSize: '0.85rem',
          '& td, & th': { py: 0.4, pr: 2, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' },
          '& th': { color: 'text.secondary', fontWeight: 600 },
        }}
      >
        <thead>
          <tr>
            <th>{t.colD20}</th>
            <th>{t.colLock}</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((b) => {
            const tone = b.result === 'open' ? COLORS.fit : TONES[b.outcome];
            const label =
              b.result === 'fumble'
                ? t.bandFumble
                : b.result === 'open'
                  ? t.bandOpen
                  : `${t.levels[b.result]}${b.outcome === 'poor' ? t.bandPoor : b.outcome === 'good' ? t.bandGood : ''}`;
            return (
              <tr key={b.from}>
                <Box component="td" sx={{ fontWeight: 700, color: tone, whiteSpace: 'nowrap' }}>
                  {b.from === b.to ? b.from : `${b.from} – ${b.to}`}
                </Box>
                <td>{label}</td>
              </tr>
            );
          })}
        </tbody>
      </Box>
    </Box>
  );
}

function LockCard({ lock, onCopy, onQr, onDelete }: { lock: GmLock; onCopy: () => void; onQr: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const bonus = lock.bonus ?? null;
  const time = lock.timeLimit > 0 ? `${formatLimit(lock.timeLimit)}${lock.showTimer === false ? ` (${t.hiddenTimer})` : ''}` : t.noLimit;
  return (
    <Box data-testid="gm-lock" sx={{ p: 1.5, borderRadius: 1, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.02)' }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {lock.name || t.untitled}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t.dcShort} {lock.dc} · {time} · {bonus === null ? t.bonusByPlayer : t.bonusShort(signed(bonus))}
            {lock.tiers ? ` · ${t.tiersShort}` : ''}
          </Typography>
        </Box>
        <Tooltip title={t.previewToggle}>
          <IconButton aria-label={t.previewToggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <ExpandMoreRoundedIcon fontSize="small" sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t.copyLink}>
          <IconButton aria-label={t.copyLink} onClick={onCopy}>
            <ContentCopyRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t.showQr}>
          <IconButton aria-label={t.showQr} onClick={onQr}>
            <QrCode2RoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t.openAsPlayer}>
          <IconButton aria-label={t.openAsPlayer} component="a" href={playerLink(lock)} target="_blank" rel="noopener">
            <OpenInNewRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t.deleteLock}>
          <IconButton aria-label={t.deleteLock} onClick={onDelete}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ mt: 1.5 }}>
          <RollPreview dc={lock.dc} tiers={lock.tiers} bonus={bonus} />
        </Box>
      </Collapse>
    </Box>
  );
}

export default function GmApp() {
  const { t } = useI18n();
  const [locks, setLocksState] = useState<GmLock[]>(loadLocks);
  const [name, setName] = useState('');
  const [choice, setChoice] = useState('15');
  const [customDc, setCustomDc] = useState('');
  const [bonusText, setBonusText] = useState('');
  const [timeLimit, setTimeLimit] = useState(0);
  const [showTimer, setShowTimer] = useState(true);
  const [tiers, setTiers] = useState(true);
  const [qrLock, setQrLock] = useState<GmLock | null>(null);
  const [copied, setCopied] = useState(false);

  const setLocks = (next: GmLock[]) => {
    setLocksState(next);
    localStorage.setItem(STORAGE_KEYS.gmLocks, JSON.stringify(next));
  };

  const dc = choice === CUSTOM ? parseInteger(customDc) : Number(choice);
  const dcValid = dc !== null && dc >= 0 && dc <= 60;
  const bonus = parseInteger(bonusText);

  const create = () => {
    if (!dcValid) return;
    const lock: GmLock = {
      id: crypto.randomUUID(),
      name: name.trim(),
      dc,
      tiers,
      timeLimit,
      showTimer,
      bonus,
      seed: newSeed(),
      createdAt: Date.now(),
    };
    setLocks([lock, ...locks]);
    setName('');
    setBonusText('');
    setQrLock(lock);
  };

  const copy = (link: string) => {
    void navigator.clipboard?.writeText(link);
    setCopied(true);
  };

  const remove = (lock: GmLock) => {
    if (window.confirm(t.confirmDelete(lock.name || t.untitled))) setLocks(locks.filter((l) => l.id !== lock.id));
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
      <AppHeader
        title={t.gmTitle}
        actions={
          <Button href="../" size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
            {t.freePlay}
          </Button>
        }
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t.gmIntro}
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {t.gmNewTitle}
        </Typography>
        <Stack spacing={2}>
          <TextField
            size="small"
            label={t.nameLabel}
            placeholder={t.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 60, 'data-testid': 'gm-name' } }}
          />
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
                value={customDc}
                onChange={(e) => setCustomDc(e.target.value)}
                sx={{ width: 110 }}
                slotProps={{ htmlInput: { min: 0, max: 60 } }}
                autoFocus
              />
            )}
            <TextField
              size="small"
              type="number"
              label={t.playerBonusLabel}
              value={bonusText}
              onChange={(e) => setBonusText(e.target.value)}
              sx={{ width: 150 }}
              slotProps={{ htmlInput: { 'data-testid': 'gm-bonus' } }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: '4px !important' }}>
            {t.playerBonusHelp}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1, alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label={t.timeLimitLabel}
              value={String(timeLimit)}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              sx={{ width: 160 }}
              slotProps={{ htmlInput: { 'data-testid': 'gm-time' } }}
            >
              {TIME_LIMITS.map((seconds, i) => (
                <MenuItem key={seconds} value={String(seconds)}>
                  {t.timeOptions[i]}
                </MenuItem>
              ))}
            </TextField>
            {timeLimit > 0 && (
              <Tooltip title={t.showTimerHelp} placement="right">
                <FormControlLabel
                  control={<Switch size="small" checked={showTimer} onChange={(e) => setShowTimer(e.target.checked)} />}
                  label={<Typography variant="body2">{t.showTimerLabel}</Typography>}
                  data-testid="gm-show-timer"
                />
              </Tooltip>
            )}
          </Stack>
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
              sx={{ alignSelf: 'flex-start' }}
              control={<Switch size="small" checked={tiers} onChange={(e) => setTiers(e.target.checked)} />}
              label={<Typography variant="body2">{t.tiersLabel}</Typography>}
            />
          </Tooltip>
          {dcValid && <RollPreview dc={dc} tiers={tiers} bonus={bonus} />}
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<QrCode2RoundedIcon />} onClick={create} disabled={!dcValid} data-testid="gm-create">
              {t.createLink}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" component="h2">
          {t.myLocks}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1.5 }}>
          {locks.length === 0 ? t.noLocks : t.savedHere}
        </Typography>
        <Stack spacing={1.5}>
          {locks.map((lock) => (
            <LockCard key={lock.id} lock={lock} onCopy={() => copy(playerLink(lock))} onQr={() => setQrLock(lock)} onDelete={() => remove(lock)} />
          ))}
        </Stack>
      </Paper>

      <QrDialog lock={qrLock} onClose={() => setQrLock(null)} onCopy={copy} />
      <Snackbar open={copied} autoHideDuration={2500} onClose={() => setCopied(false)} message={t.linkCopied} />
    </Container>
  );
}
