// The Codex's place lives in the URL hash (bookmarkable, and Back works): `#/?q=…` to browse, `#/a/<path>` to read.
import { useSyncExternalStore } from 'react';
import { browseHref, parseRoute, type BrowseParams, type Route } from '@atlas/core/codex';

const listeners = new Set<() => void>();
let hash = location.hash;
let route = parseRoute(hash);
function refresh(): void {
  if (location.hash === hash) return;
  hash = location.hash;
  route = parseRoute(hash);
  listeners.forEach(listener => {
    listener();
  });
}
window.addEventListener('hashchange', refresh);

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const useRoute = (): Route => useSyncExternalStore(subscribe, () => route);
export const currentRoute = (): Route => route;

// Filters and opening articles push history, so Back steps through them; typing a search replaces it.
export function navigate(href: string, { replace = false } = {}): void {
  if (replace) {
    history.replaceState(null, '', href);
    refresh();
  } else location.hash = href;
}

export function setParams(changes: Partial<BrowseParams>, options?: { replace?: boolean }): void {
  navigate(browseHref({ ...route.params, ...changes }), options);
}
