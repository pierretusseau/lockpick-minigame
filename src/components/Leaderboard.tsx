/**
 * Leaderboard UI:
 * - `SolvedLeaderboard`, under the lock once it is open: saves the time (asks for a name the
 *   first time), then shows the level's top 10 and this lock's top 10;
 * - `LeaderboardDialog`, from the header: the top 10 of any level.
 */
import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { LOCK_LEVEL_ORDER, MAX_NAME_LENGTH, cleanPlayerName, type LockLevel, type Run } from '../engine';
import { formatDuration } from '../format';
import { useI18n } from '../i18n';
import { RunRefusedError, fetchBoards, savePlayerName, savedPlayerName, submitRun, type Board, type Boards, type LockRef } from '../leaderboard';
import { COLORS } from './theme';

function BoardTable({ title, board }: { title: string; board: Board }) {
  const { t } = useI18n();
  const meShown = board.top.some((e) => e.me);
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.gold, mb: 0.5 }}>
        {title}
      </Typography>
      {board.top.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t.boardEmpty}
        </Typography>
      ) : (
        <Box component="ol" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
          {board.top.map((entry, i) => (
            <Box
              component="li"
              key={i}
              sx={{
                display: 'flex',
                gap: 1,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: entry.me ? 'rgba(226,184,103,0.16)' : undefined,
                fontWeight: entry.me ? 700 : undefined,
              }}
            >
              <Box component="span" sx={{ width: 24, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                {i + 1}
              </Box>
              <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.name}
              </Box>
              <Box component="span" sx={{ fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                {formatDuration(entry.timeMs)}
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {!meShown && board.myRank !== null && board.myTimeMs !== null && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, px: 0.75 }}>
          {t.yourRank(board.myRank, formatDuration(board.myTimeMs))}
        </Typography>
      )}
    </Box>
  );
}

function BoardsView({ boards, level }: { boards: Boards; level: LockLevel }) {
  const { t } = useI18n();
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 3 }} data-testid="leaderboard-boards">
      <BoardTable title={t.boardLevel(t.levels[level])} board={boards.level} />
      {boards.lock && <BoardTable title={t.boardLock} board={boards.lock} />}
    </Stack>
  );
}

function NameForm({ initial, onSubmit, busy }: { initial: string; onSubmit: (name: string) => void; busy: boolean }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const name = cleanPlayerName(draft);
  const submit = () => name && !busy && onSubmit(name);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <TextField
        size="small"
        label={t.playerName}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        slotProps={{ htmlInput: { maxLength: MAX_NAME_LENGTH + 10, 'data-testid': 'player-name' } }}
        sx={{ flex: 1, maxWidth: 320 }}
      />
      <Button variant="contained" onClick={submit} disabled={!name || busy} data-testid="save-time">
        {t.saveTime}
      </Button>
    </Stack>
  );
}

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; boards: Boards } | { kind: 'refused' } | { kind: 'error' };

export interface SolvedLeaderboardProps {
  /** The finished run; `null` when it is not ranked (help used). */
  run: Run | null;
  lock: LockRef;
}

export function SolvedLeaderboard({ run, lock }: SolvedLeaderboardProps) {
  const { t } = useI18n();
  const [name, setName] = useState(savedPlayerName);
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const [unrankedBoards, setUnrankedBoards] = useState<Boards | null>(null);

  const save = (chosen: string) => {
    if (!run) return;
    savePlayerName(chosen);
    setName(chosen);
    setEditing(false);
    setState({ kind: 'saving' });
    submitRun(chosen, run).then(
      (boards) => setState({ kind: 'saved', boards }),
      (error: unknown) => setState({ kind: error instanceof RunRefusedError ? 'refused' : 'error' }),
    );
  };

  // A known player is saved straight away; an unranked run still shows the boards.
  useEffect(() => {
    if (run && name) save(name);
    if (!run) fetchBoards(lock.level, lock).then(setUnrankedBoards, () => setState({ kind: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the lock opens
  }, []);

  const boards = state.kind === 'saved' ? state.boards : unrankedBoards;
  return (
    <Paper sx={{ p: 2, mt: 2 }} data-testid="solved-leaderboard">
      <Typography variant="h6" component="h2" gutterBottom>
        {t.leaderboard}
      </Typography>
      <Stack spacing={2}>
        {!run && <Alert severity="info">{t.notRanked}</Alert>}
        {run && (!name || editing) && state.kind !== 'saving' && <NameForm initial={name} busy={false} onSubmit={save} />}
        {state.kind === 'saving' && <Typography color="text.secondary">{t.loading}</Typography>}
        {state.kind === 'refused' && <Alert severity="warning">{t.rankRefused}</Alert>}
        {state.kind === 'error' && <Alert severity="error">{t.rankError}</Alert>}
        {state.kind === 'saved' && !editing && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {t.savedAs(name)}
            </Typography>
            <Button size="small" onClick={() => setEditing(true)}>
              {t.changeName}
            </Button>
          </Stack>
        )}
        {boards && <BoardsView boards={boards} level={lock.level} />}
      </Stack>
    </Paper>
  );
}

export interface LeaderboardDialogProps {
  open: boolean;
  onClose: () => void;
  /** Level shown first. */
  level: LockLevel;
  /** Lock on screen: its own board is shown next to its level's. */
  lock: LockRef | null;
}

export function LeaderboardDialog({ open, onClose, level, lock }: LeaderboardDialogProps) {
  const { t } = useI18n();
  // The content unmounts once closed: each opening starts again from `level`.
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t.leaderboard}</DialogTitle>
      <DialogContent>
        <LeaderboardContent initialLevel={level} lock={lock} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.close}</Button>
      </DialogActions>
    </Dialog>
  );
}

function LeaderboardContent({ initialLevel, lock }: { initialLevel: LockLevel; lock: LockRef | null }) {
  const { t } = useI18n();
  const [level, setLevel] = useState(initialLevel);
  const [result, setResult] = useState<{ level: LockLevel; boards: Boards | 'error' } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBoards(level, lock && lock.level === level ? lock : null).then(
      (boards) => !cancelled && setResult({ level, boards }),
      () => !cancelled && setResult({ level, boards: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [level, lock]);

  const shown = result?.level === level ? result.boards : null;
  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField select size="small" label={t.levelLabel} value={level} onChange={(e) => setLevel(e.target.value as LockLevel)}>
        {LOCK_LEVEL_ORDER.map((l) => (
          <MenuItem key={l} value={l}>
            {t.levels[l]}
          </MenuItem>
        ))}
      </TextField>
      {shown === 'error' ? (
        <Alert severity="error">{t.rankError}</Alert>
      ) : shown ? (
        <BoardsView boards={shown} level={level} />
      ) : (
        <Typography color="text.secondary">{t.loading}</Typography>
      )}
    </Stack>
  );
}
