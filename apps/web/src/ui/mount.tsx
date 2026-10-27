// Mounts the React screens into index.html once the state has loaded (the header, sidebar and banner are still
// vanilla).
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from './home/Home.tsx';
import { Systems } from './systems/Systems.tsx';
import { SystemPanel } from './systems/SystemPanel.tsx';
import { Outlaw } from './outlaw/Outlaw.tsx';
import { Calculators } from './calculators/Calculators.tsx';
import { Guides } from './guides/Guides.tsx';
import { Book } from './guides/Book.tsx';
import { More } from './more/More.tsx';
import { BOOKS } from '@atlas/core/guides';

const SCREENS: [string, ReactNode][] = [
  ['homeRoot', <Home />],
  ['systemsRoot', <Systems />],
  ['outlawRoot', <Outlaw />],
  ['calculatorsRoot', <Calculators />],
  ['systemPanelRoot', <SystemPanel />],
  ['guidesRoot', <Guides />],
  ...BOOKS.map(({ key }): [string, ReactNode] => [`${key}Root`, <Book book={key} />]),
  ['moreRoot', <More />]
];

export function mountScreens(): void {
  for (const [id, screen] of SCREENS) {
    const container = document.getElementById(id);
    if (container) createRoot(container).render(<StrictMode>{screen}</StrictMode>);
  }
}
