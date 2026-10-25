/** "How to play" dialog. The d20 → lock rules are left out for players of a GM link. */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { useI18n } from '../i18n';

function Bullets({ lines }: { lines: readonly string[] }) {
  return (
    <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
      {lines.map((line) => (
        <Typography component="li" variant="body2" key={line} sx={{ mb: 0.75 }}>
          {line}
        </Typography>
      ))}
    </Box>
  );
}

export function HelpDialog({ open, onClose, rules }: { open: boolean; onClose: () => void; rules: boolean }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t.howTitle}</DialogTitle>
      <DialogContent>
        <Bullets lines={t.how} />
        {rules && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2 }}>
              {t.rulesTitle}
            </Typography>
            <Bullets lines={t.rules} />
          </>
        )}
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2 }}>
          {t.credits}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
