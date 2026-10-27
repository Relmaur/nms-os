// The Codex page's entry (wiki/index.html): the service worker, then the React page once the archive has loaded.
import '../../app/zod-config.ts'; // before anything that parses with Zod
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from '../../app/pwa.js';
import { Codex } from './Codex.tsx';
import { loadCodex } from './codex-data.ts';

registerServiceWorker();
const root = document.getElementById('codexRoot');
if (root)
  createRoot(root).render(
    <StrictMode>
      <Codex />
    </StrictMode>
  );
void loadCodex();
