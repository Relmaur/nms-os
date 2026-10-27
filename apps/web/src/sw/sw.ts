/// <reference lib="webworker" />
// Service worker: makes ATLAS // MASTER OS installable and fully usable offline.
// The build output (pages, modules, styles, icons, latin fonts) and the wiki indexes are precached under content-hash
// revisions, so each deploy is one consistent version that updates in place. Data that changes between deploys is
// fetched network-first; individual wiki articles are cached as they are read.
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] };

void self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Caches from the hand-written worker that shipped before 3.1.0.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('atlas-os-')).map(key => caches.delete(key))))
  );
});

// The shared state file and the verification report: latest when online, last copy when not. The first visit fetches
// them before this worker controls the page, so they are fetched once here too.
const DATA_CACHE = 'atlas-data';
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(DATA_CACHE)
      .then(cache => cache.addAll(['nms_state.json', 'wiki/verification.json']))
      .catch(() => undefined) // a missing verification report must not block installing the app
  );
});
registerRoute(
  ({ url, sameOrigin }) =>
    sameOrigin && (url.pathname.endsWith('/nms_state.json') || url.pathname.endsWith('/wiki/verification.json')),
  new NetworkFirst({ cacheName: DATA_CACHE, networkTimeoutSeconds: 5 })
);

// Wiki articles (3,000+ files): answered from cache instantly once read, refreshed in the background.
registerRoute(
  ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/wiki/') && url.pathname.endsWith('.md'),
  new StaleWhileRevalidate({ cacheName: 'atlas-wiki-articles' })
);

// Font files for scripts other than Latin are fetched only when a page needs them.
registerRoute(
  ({ request, sameOrigin }) => sameOrigin && request.destination === 'font',
  new CacheFirst({ cacheName: 'atlas-fonts' })
);
