// Mounts the main page's React roots into index.html: the frame (header, sidebar, tab bar, storage banner) right
// away, and the screens once the state has loaded, so none flashes the built-in defaults.
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
import { Header } from './shell/Header.tsx';
import { Sidebar } from './shell/Sidebar.tsx';
import { TabBar } from './shell/TabBar.tsx';
import { StorageBanner } from './shell/StorageBanner.tsx';
import { SessionBar } from './session/SessionBar.tsx';
import { SessionSheet } from './session/SessionSheet.tsx';

const FRAME: [string, ReactNode][] = [
  ['headerRoot', <Header />],
  ['sidebarNav', <Sidebar />],
  ['tabBarRoot', <TabBar />],
  ['storageBannerRoot', <StorageBanner />],
  ['sessionBarRoot', <SessionBar />],
  ['sessionSheetRoot', <SessionSheet />]
];

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

function mount(roots: [string, ReactNode][]): void {
  for (const [id, node] of roots) {
    const container = document.getElementById(id);
    if (container) createRoot(container).render(<StrictMode>{node}</StrictMode>);
  }
}

export function mountFrame(): void {
  mount(FRAME);
}

export function mountScreens(): void {
  mount(SCREENS);
}
