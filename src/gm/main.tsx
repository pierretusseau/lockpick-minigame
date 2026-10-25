import { createRoot } from 'react-dom/client';
import { Root } from '../Root';
import GmApp from './GmApp';

createRoot(document.getElementById('root')!).render(
  <Root>
    <GmApp />
  </Root>,
);
