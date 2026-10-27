// Mounts the React Home screen into index.html's #homeRoot (the rest of the page is still vanilla).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from './Home.tsx';

export function mountHome(): void {
  const container = document.getElementById('homeRoot');
  if (!container) return;
  createRoot(container).render(
    <StrictMode>
      <Home />
    </StrictMode>
  );
}
