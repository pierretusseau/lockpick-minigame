/** Providers shared by every page: dark theme, baseline CSS, texts. */
import { StrictMode, type ReactNode } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { I18nProvider } from './i18n';
import './index.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e2b867' },
    background: { default: '#0f0c08', paper: '#1c1712' },
  },
  shape: { borderRadius: 8 },
});

export function Root({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <I18nProvider>{children}</I18nProvider>
      </ThemeProvider>
    </StrictMode>
  );
}
