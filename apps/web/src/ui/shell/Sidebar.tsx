// Desktop navigation (the bottom tab bar replaces it below lg), with live counts beside each place.
import type { ReactNode } from 'react';
import { guideProgress } from '@atlas/core/guides';
import { useAppState } from '../useAppState.ts';
import { useWikiCount } from './wiki-index.ts';
import { useLoaded, useOutlawReady } from './counts.ts';
import { showSection, useSection } from './section-store.ts';

export function Sidebar() {
  const state = useAppState();
  const section = useSection();
  const outlaw = useOutlawReady();
  const wikiCount = useWikiCount();
  const loaded = useLoaded();
  const at = section.startsWith('book') ? 'guides' : section; // a book is part of Guides
  const item = (key: string, icon: string, color: string, label: string, count?: ReactNode, countId?: string) => (
    <li>
      <button
        type="button"
        onClick={() => {
          showSection(key);
        }}
        id={`nav-${key}`}
        aria-current={at === key ? 'page' : undefined}
        className="nav-btn"
      >
        <span className={`nav-tile ${color}`}>
          <i className={`ph-bold ${icon}`} aria-hidden="true" />
        </span>
        <span className="truncate">{label}</span>
        {count !== undefined && (
          <span id={countId} className="nav-count">
            {count}
          </span>
        )}
      </button>
    </li>
  );
  return (
    <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-6 space-y-8">
      <div>
        <p className="nav-group-label">Companion</p>
        <ul className="space-y-1">
          {item('home', 'ph-house', 'text-cyan-300', 'Home')}
          {item(
            'systems',
            'ph-planet',
            'text-purple-300',
            'Systems',
            loaded ? state.systems.length : 0,
            'sidebarSystemsCount'
          )}
          {item(
            'outlaw',
            'ph-skull',
            'text-red-300',
            'Outlaw Run',
            outlaw.total ? `${String(outlaw.ready)}/${String(outlaw.total)}` : '0',
            'sidebarOutlawCount'
          )}
          {item('calculators', 'ph-calculator', 'text-amber-300', 'Calculators')}
          <li>
            <a href="wiki/" className="nav-btn">
              <span className="nav-tile text-emerald-300">
                <i className="ph-bold ph-books" aria-hidden="true" />
              </span>
              <span className="truncate">Wiki Codex</span>
              <span id="sidebarWikiCount" className="nav-count">
                {(wikiCount ?? 0).toLocaleString()}
              </span>
              <i className="ph-bold ph-arrow-up-right text-xs text-slate-400 ml-2" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </div>
      <div>
        <p className="nav-group-label">Library</p>
        <ul className="space-y-1">
          {item(
            'guides',
            'ph-book-open-text',
            'text-sky-300',
            'Guides',
            `${String(loaded ? guideProgress(state.checklists).pct : 0)}%`
          )}
          {item('more', 'ph-gear-six', 'text-slate-300', 'Device & data')}
        </ul>
      </div>
    </nav>
  );
}
