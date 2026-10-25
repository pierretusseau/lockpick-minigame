import { createRoot } from 'react-dom/client';
import App from './App';
import PlayerApp from './PlayerApp';
import { Root } from './Root';

// A link prepared by the GM (`?s=…`) opens the player view: the lock only, no settings.
const sharedCode = new URLSearchParams(window.location.search).get('s');

createRoot(document.getElementById('root')!).render(<Root>{sharedCode ? <PlayerApp code={sharedCode} /> : <App />}</Root>);
