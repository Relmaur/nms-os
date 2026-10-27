// Mounts the React screens into index.html once the state has loaded (the rest of the page is still vanilla).
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from './home/Home.tsx';
import { Systems } from './systems/Systems.tsx';
import { SystemPanel } from './systems/SystemPanel.tsx';
import { Outlaw } from './outlaw/Outlaw.tsx';
import { Calculators } from './calculators/Calculators.tsx';

const SCREENS: [string, ReactNode][] = [
  ['homeRoot', <Home />],
  ['systemsRoot', <Systems />],
  ['outlawRoot', <Outlaw />],
  ['calculatorsRoot', <Calculators />],
  ['systemPanelRoot', <SystemPanel />]
];

export function mountScreens(): void {
  for (const [id, screen] of SCREENS) {
    const container = document.getElementById(id);
    if (container) createRoot(container).render(<StrictMode>{screen}</StrictMode>);
  }
}
