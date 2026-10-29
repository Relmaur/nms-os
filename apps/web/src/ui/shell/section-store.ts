// Which section of the main page is open, kept in the URL hash (#home, #systems, #book3, …). The sections are shells
// in index.html, one per screen, and only the open one is shown; every screen stays mounted (the header search reads
// the hidden books). Features react to a section opening through onSection().
import { useSyncExternalStore } from 'react';

const hooks = new Map<string, () => void>();
export function onSection(key: string, run: () => void): void {
  hooks.set(key, run);
}

let current = '';
const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useSection(): string {
  return useSyncExternalStore(subscribe, () => current);
}

// Old and shortcut addresses: the Logbook was folded into Systems; #new-system (a home-screen shortcut) opens Home
// with the editor, and #search (the Codex page's search key) opens Home with the search; anything unknown opens Home.
const SHORTCUTS = new Set(['new-system', 'search']);
function resolve(key: string): { section: string; shortcut: string } {
  if (key === 'logbook') return { section: 'systems', shortcut: '' };
  if (SHORTCUTS.has(key)) return { section: 'home', shortcut: key };
  return { section: document.getElementById(`sec-${key}`) ? key : 'home', shortcut: '' };
}

// Resolves once the section is on screen (after the view transition's swap), so a caller can scroll within it.
export function showSection(key: string): Promise<void> {
  if (key === 'wiki') {
    location.href = 'wiki/'; // the Codex is its own page
    return Promise.resolve();
  }
  const { section, shortcut } = resolve(key);
  const swap = () => {
    document.body.dataset.section = section; // for styles that differ by screen (theme.css: Home's header)
    document.querySelectorAll('.book-section').forEach(element => {
      element.classList.toggle('hidden', element.id !== `sec-${section}`);
    });
    window.scrollTo({ top: 0 });
  };
  const animate = current !== '' && current !== section && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Switching again mid-animation skips the transition, which rejects its promises; the DOM still updates, so the
  // rejection is expected and must not surface as an uncaught error.
  let shown = Promise.resolve();
  if (animate && 'startViewTransition' in document) {
    const transition = document.startViewTransition(swap);
    transition.ready.catch(() => undefined);
    shown = transition.updateCallbackDone.catch(() => undefined);
  } else swap();
  current = section;
  listeners.forEach(listener => {
    listener();
  });
  if (location.hash !== `#${section}`) history.replaceState(null, '', `#${section}`);
  if (shortcut) hooks.get(shortcut)?.();
  hooks.get(section)?.();
  return shown;
}

// Back/forward and home-screen shortcuts (./#calculators) change only the hash.
export function startSections(): void {
  window.addEventListener('hashchange', () => {
    void showSection(location.hash.slice(1) || 'home');
  });
  void showSection(location.hash.slice(1) || 'home');
}
