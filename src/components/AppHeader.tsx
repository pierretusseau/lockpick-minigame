/** Page header: icon, title, page-specific buttons, help, language, GitHub. */
import { useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import GitHubIcon from '@mui/icons-material/GitHub';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { useI18n, type Lang } from '../i18n';
import { HelpDialog } from './HelpDialog';
import { LockpicksIcon } from './LockpicksIcon';
import { COLORS } from './theme';

export const REPO_URL = 'https://github.com/pierretusseau/lockpick-minigame';

export interface AppHeaderProps {
  title: string;
  /** Buttons shown before the help button (settings, GM mode…). */
  actions?: ReactNode;
  /** Help dialog: also explain how the d20 turns into a lock (hidden from players). */
  helpRules?: boolean;
}

export function AppHeader({ title, actions, helpRules = true }: AppHeaderProps) {
  const { t, lang, setLang } = useI18n();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = title === t.appTitle ? title : `${title} — ${t.appTitle}`;
  }, [lang, title, t.appTitle]);

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
      <Box sx={{ color: COLORS.brassBright, display: 'flex' }}>
        <LockpicksIcon size={32} />
      </Box>
      <Typography variant="h4" component="h1" sx={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: { xs: '1.35rem', sm: '2rem' } }}>
        {title}
      </Typography>
      {actions}
      <Tooltip title={t.help}>
        <IconButton aria-label={t.help} onClick={() => setHelpOpen(true)} data-testid="open-help">
          <HelpOutlineRoundedIcon />
        </IconButton>
      </Tooltip>
      <ToggleButtonGroup exclusive size="small" value={lang} onChange={(_, value: Lang | null) => value && setLang(value)} aria-label={t.languageLabel}>
        <ToggleButton value="en">EN</ToggleButton>
        <ToggleButton value="fr">FR</ToggleButton>
      </ToggleButtonGroup>
      <Tooltip title={t.sourceCode}>
        <IconButton
          component="a"
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.sourceCode}
          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
        >
          <GitHubIcon />
        </IconButton>
      </Tooltip>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} rules={helpRules} />
    </Stack>
  );
}
