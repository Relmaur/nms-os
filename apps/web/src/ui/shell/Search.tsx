// The header search: your systems, Codex articles and the books, in one list driven from the keyboard (arrows,
// Enter, Esc; / or ⌘K to start). From md it drops down under the field; on a phone it is a full-screen overlay
// opened from the header's search button.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { search } from '@atlas/core/search';
import { searchSystems, type System } from '@atlas/core/systems-model';
import type { PreparedEntry } from '@atlas/core/search';
import { appState } from '../../app/store.ts';
import { Highlight, SourceBadge, categoryIcon } from '../codex/bits.tsx';
import { StarDot } from '../parts/SystemBits.tsx';
import { openSystem } from '../systems/panel-store.ts';
import { findBookHits, flash, snippetAround, type BookHit } from './book-search.ts';
import { showSection } from './section-store.ts';
import { onWikiEntries, wikiEntries } from './wiki-index.ts';

const WIKI_LIMIT = 6;
const BOOK_LIMIT = 6;
const SYSTEM_LIMIT = 5;
const PHONE = '(max-width: 767px)';

type Hit =
  { type: 'system'; system: System } | { type: 'wiki'; entry: PreparedEntry } | { type: 'book'; book: BookHit };
interface Results {
  query: string;
  tokens: string[];
  hits: Hit[];
  systemCount: number;
  wikiCount: number;
}
const EMPTY: Results = { query: '', tokens: [], hits: [], systemCount: 0, wikiCount: 0 };

// The phone's full-screen search, opened from the header's button. Its look lives in theme.css on body.search-open
// (the header's backdrop-filter must go there, or it would become the fixed overlay's containing block). The class
// is set and the field focused within the tap itself, so iOS raises the keyboard.
let overlay = false;
const overlayListeners = new Set<() => void>();
function setOverlay(next: boolean): void {
  overlay = next;
  document.body.classList.toggle('search-open', next);
  document.body.classList.toggle('overflow-hidden', next);
  overlayListeners.forEach(listener => {
    listener();
  });
}
function subscribeOverlay(listener: () => void): () => void {
  overlayListeners.add(listener);
  return () => overlayListeners.delete(listener);
}
export function openSearch(): void {
  setOverlay(true);
  document.getElementById('globalSearchInput')?.focus();
}

function find(query: string): Results {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return { ...EMPTY, query };
  const systems = searchSystems(appState.systems, query);
  const wiki = search(wikiEntries(), query).map(result => result.entry);
  const hits: Hit[] = [
    ...systems.slice(0, SYSTEM_LIMIT).map(system => ({ type: 'system' as const, system })),
    ...wiki.slice(0, WIKI_LIMIT).map(entry => ({ type: 'wiki' as const, entry })),
    ...findBookHits(tokens, BOOK_LIMIT).map(book => ({ type: 'book' as const, book }))
  ];
  return { query, tokens, hits, systemCount: systems.length, wikiCount: wiki.length };
}

export function Search() {
  const [results, setResults] = useState(EMPTY);
  const [open, setOpen] = useState(false); // the results list
  const phoneOverlay = useSyncExternalStore(subscribeOverlay, () => overlay);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const run = (query: string) => {
    const next = find(query);
    setResults(next);
    setActive(-1);
    setOpen(next.tokens.length > 0);
  };
  const close = () => {
    setOverlay(false);
    setOpen(false);
    input.current?.blur();
  };

  // The wiki index loads after the page does: a search typed before it arrives fills in its wiki results then.
  useEffect(
    () =>
      onWikiEntries(() => {
        setResults(current => (current.query.trim() ? find(current.query) : current));
      }),
    []
  );

  // Widening the window past the phone layout leaves the overlay.
  useEffect(() => {
    if (!phoneOverlay) return;
    const phone = matchMedia(PHONE);
    const leave = () => {
      if (!phone.matches) setOverlay(false);
    };
    phone.addEventListener('change', leave);
    return () => {
      phone.removeEventListener('change', leave);
    };
  }, [phoneOverlay]);

  // / or ⌘K starts a search from anywhere; a tap outside closes the list.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      if ((event.key === '/' && !typing) || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        if (matchMedia(PHONE).matches) openSearch();
        else input.current?.focus();
      }
    };
    const onDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  });

  const activate = (hit: Hit | undefined) => {
    if (!hit) return;
    const query = results.query;
    close();
    if (hit.type === 'system') {
      showSection('systems');
      openSystem(hit.system.id);
    } else if (hit.type === 'wiki') {
      location.assign(`wiki/#/a/${encodeURIComponent(hit.entry.path ?? '')}?q=${encodeURIComponent(query)}`);
    } else {
      showSection(hit.book.section);
      flash(hit.book.el);
    }
  };

  const move = (step: number) => {
    if (!results.hits.length) return;
    const next = (active + step + results.hits.length) % results.hits.length;
    setActive(next);
    document.getElementById(`search-hit-${String(next)}`)?.scrollIntoView({ block: 'nearest' });
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && results.hits.length) {
      event.preventDefault();
      activate(results.hits[Math.max(active, 0)]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  const { hits, tokens } = results;
  const option = (i: number, tile: ReactNode, body: ReactNode) => (
    <button
      key={i}
      type="button"
      id={`search-hit-${String(i)}`}
      role="option"
      aria-selected={i === active}
      onClick={() => {
        activate(hits[i]);
      }}
      className="search-hit"
    >
      {tile}
      <span className="min-w-0 flex-1">{body}</span>
    </button>
  );
  const groups: ReactNode[] = [];
  hits.forEach((hit, i) => {
    const first = i === 0 || hits[i - 1]?.type !== hit.type;
    if (hit.type === 'system') {
      if (first) groups.push(<Label key="systems" label="Your systems" detail={String(results.systemCount)} />);
      const { system } = hit;
      groups.push(
        option(
          i,
          <span className="nav-tile mt-0.5">
            <StarDot system={system} />
          </span>,
          <>
            <strong className="block text-sm text-white truncate">
              <Highlight text={system.name} tokens={tokens} />
            </strong>
            <span className="block text-xs text-slate-400 truncate">
              {[system.region, ...system.tags].filter(Boolean).join(' · ') || system.galaxy}
            </span>
          </>
        )
      );
    } else if (hit.type === 'wiki') {
      if (first)
        groups.push(
          <Label
            key="wiki"
            label="Wiki articles"
            detail={`${String(results.wikiCount)} match${results.wikiCount === 1 ? '' : 'es'}`}
          />
        );
      const { entry } = hit;
      groups.push(
        option(
          i,
          <span className="nav-tile text-emerald-300 mt-0.5">
            <i className={`ph-bold ${categoryIcon(entry.category)}`} aria-hidden="true" />
          </span>,
          <>
            <span className="flex items-center gap-2">
              <strong className="text-sm text-white truncate">
                <Highlight text={entry.title} tokens={tokens} />
              </strong>
              <SourceBadge source={entry.source} />
            </span>
            <span className="block text-xs text-slate-400 truncate">
              {entry.category} · {entry.summary ?? ''}
            </span>
          </>
        )
      );
      const lastWiki = hits[i + 1]?.type !== 'wiki';
      if (lastWiki && results.wikiCount > WIKI_LIMIT)
        groups.push(
          <button
            key="all-wiki"
            type="button"
            onClick={() => {
              close();
              location.assign(`wiki/#/?q=${encodeURIComponent(results.query)}`);
            }}
            className="w-full px-3 py-2 text-left text-xs font-medium text-cyan-300 hover:text-cyan-200"
          >
            Show all {results.wikiCount} wiki results →
          </button>
        );
    } else {
      if (first) {
        const count = hits.filter(item => item.type === 'book').length;
        groups.push(
          <Label key="books" label="In the manual" detail={`${String(count)}${count === BOOK_LIMIT ? '+' : ''}`} />
        );
      }
      const { book } = hit;
      groups.push(
        option(
          i,
          <span className="nav-tile text-cyan-300 mt-0.5">
            <i className="ph-bold ph-book-open" aria-hidden="true" />
          </span>,
          <>
            <span className="block text-[11px] font-medium text-cyan-300/80 truncate">{book.title}</span>
            <span className="search-snippet block text-xs text-slate-300 leading-relaxed">
              <Highlight text={snippetAround(book.text, tokens[0] ?? '')} tokens={tokens} />
            </span>
          </>
        )
      );
    }
  });

  return (
    <div ref={root} id="globalSearch" className="hidden md:block relative flex-1 max-w-xl mx-auto">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <i
            className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={input}
            type="search"
            id="globalSearchInput"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open}
            aria-controls="globalSearchResults"
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `search-hit-${String(active)}` : undefined}
            aria-label="Search your systems, the wiki and the guides"
            placeholder="Search systems, the wiki and the guides…"
            onChange={event => {
              run(event.target.value);
            }}
            onFocus={event => {
              run(event.target.value);
            }}
            onKeyDown={onKeyDown}
            className="w-full h-10 bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-cyan-400 rounded-xl pl-9 pr-10 text-base md:text-sm text-white placeholder:text-slate-400 focus:outline-hidden transition"
          />
          <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 pointer-events-none">
            /
          </kbd>
        </div>
        <button type="button" onClick={close} className="md:hidden h-10 px-2 text-sm font-medium text-cyan-300">
          Cancel
        </button>
      </div>
      <div
        id="globalSearchResults"
        role="listbox"
        aria-label="Search results"
        className={`${open ? '' : 'hidden'} absolute left-0 right-0 top-full mt-2 max-h-[72vh] overflow-y-auto overscroll-contain rounded-2xl border border-slate-700 bg-slate-950 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.75)] p-2`}
      >
        {hits.length ? (
          groups
        ) : (
          <p className="px-3 py-6 text-center text-sm text-slate-400">
            Nothing matches “{results.query.trim()}”. Try fewer words.
          </p>
        )}
      </div>
    </div>
  );
}

function Label({ label, detail }: { label: string; detail: string }) {
  return (
    <p className="flex justify-between px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
      <span>{label}</span>
      <span className="normal-case tracking-normal font-mono font-normal">{detail}</span>
    </p>
  );
}
