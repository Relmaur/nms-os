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
// with the editor; anything unknown opens Home.
function resolve(key: string): { section: string; newSystem: boolean } {
  if (key === 'logbook') return { section: 'systems', newSystem: false };
  if (key === 'new-system') return { section: 'home', newSystem: true };
  return { section: document.getElementById(`sec-${key}`) ? key : 'home', newSystem: false };
}

export function showSection(key: string): void {
  if (key === 'wiki') {
    location.href = 'wiki/'; // the Codex is its own page
    return;
  }
  const { section, newSystem } = resolve(key);
  const swap = () => {
    document.querySelectorAll('.book-section').forEach(element => {
      element.classList.toggle('hidden', element.id !== `sec-${section}`);
    });
    window.scrollTo({ top: 0 });
  };
  const animate = current !== '' && current !== section && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Switching again mid-animation skips the transition, which rejects its promises; the DOM still updates, so the
  // rejection is expected and must not surface as an uncaught error.
  if (animate && 'startViewTransition' in document) document.startViewTransition(swap).ready.catch(() => undefined);
  else swap();
  current = section;
  listeners.forEach(listener => {
    listener();
  });
  if (location.hash !== `#${section}`) history.replaceState(null, '', `#${section}`);
  if (newSystem) hooks.get('new-system')?.();
  hooks.get(section)?.();
}

// Back/forward and home-screen shortcuts (./#calculators) change only the hash.
export function startSections(): void {
  window.addEventListener('hashchange', () => {
    showSection(location.hash.slice(1) || 'home');
  });
  showSection(location.hash.slice(1) || 'home');
}
