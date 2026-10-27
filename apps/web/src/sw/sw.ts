/// <reference lib="webworker" />
// Service worker: makes ATLAS // MASTER OS installable and fully usable offline.
// The build output (pages, modules, styles, icons, latin fonts) and the wiki indexes are precached under content-hash
// revisions, so each deploy is one consistent version that updates in place. Data that changes between deploys is
// fetched network-first; individual wiki articles are cached as they are read.
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

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
    caches.open(DATA_CACHE).then(cache =>
      // One at a time: a missing verification report must neither block installing nor skip the state file.
      Promise.allSettled(['nms_state.json', 'wiki/verification.json'].map(url => cache.add(url)))
    )
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

// Any other page address (a query string, /wiki without the slash) goes to the network; offline it falls back to the
// matching precached page, as the pre-3.1 worker did.
registerRoute(new NavigationRoute(new NetworkOnly()));
setCatchHandler(async ({ request, url }) => {
  if (request.mode !== 'navigate') return Response.error();
  const page = /\/wiki\/?$/.test(url.pathname) ? 'wiki/index.html' : 'index.html';
  return (await matchPrecache(page)) ?? Response.error();
});

// A timer pushed by the relay while the app sleeps (ADR-0006). The payload is only the timer's id; the words come from
// the cache the page filled (src/app/push.ts), so the relay never sees a timer's name. The tag is the timer's id, the
// same as the open app's own alert (timer-runner.ts), so the two replace each other rather than doubling. Browsers
// expect a notification for every push, so one is always shown.
self.addEventListener('push', event => {
  let id = '';
  try {
    const data: unknown = event.data?.json();
    if (data && typeof data === 'object' && 't' in data && typeof data.t === 'string') id = data.t;
  } catch {}
  event.waitUntil(
    (async () => {
      let note = { title: 'A timer is done', body: 'Tap to open ATLAS.' };
      if (/^[A-Za-z0-9_-]{1,80}$/.test(id)) {
        const saved = await caches.match(new URL(`timer-notes/${id}`, self.registration.scope).href, {
          cacheName: 'atlas-timer-notes'
        });
        const parsed: unknown = await saved?.json().catch(() => null);
        if (parsed && typeof parsed === 'object' && 'title' in parsed && typeof parsed.title === 'string')
          note = { title: parsed.title, body: 'body' in parsed && typeof parsed.body === 'string' ? parsed.body : '' };
      }
      await self.registration.showNotification(note.title, {
        body: note.body,
        ...(id && { tag: id }),
        icon: 'assets/icons/icon-192.png'
      });
    })()
  );
});

// The browser replaced this device's push subscription (Firefox and Chrome do, now and then) while the app may be
// asleep: subscribe again and send the relay the new one with the last schedule, from what the page left in the notes
// cache. Without this the relay's next push would fail and drop the device until the app is opened.
interface DeviceNote {
  url: string;
  key: string;
  deviceId: string;
  token: string;
  timers: unknown[];
}
const toBytes = (text: string) =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0));
self.addEventListener('pushsubscriptionchange', event => {
  // PushSubscriptionChangeEvent isn't in TypeScript's WebWorker library yet.
  const change = event as ExtendableEvent & { newSubscription?: PushSubscription | null };
  change.waitUntil(
    (async () => {
      const saved = await caches.match(new URL('timer-notes/_device', self.registration.scope).href, {
        cacheName: 'atlas-timer-notes'
      });
      const device = (await saved?.json().catch(() => null)) as DeviceNote | null;
      if (!device?.url || !device.deviceId) return;
      const subscription =
        change.newSubscription ??
        (await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toBytes(device.key)
        }));
      const { endpoint, keys } = subscription.toJSON();
      await fetch(`${device.url}/v1/push/${device.deviceId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${device.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: { endpoint, keys }, now: Date.now(), timers: device.timers })
      });
    })().catch(() => undefined)
  );
});

// A finished-timer notification (src/ui/session/timer-runner.ts, or a push): tapping it brings the app back, or opens it.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const home = new URL('./#home', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      // The app's own tab, not a Codex one (wiki/ is in scope too).
      const open = windows.find(
        client => client.url.startsWith(self.registration.scope) && !client.url.includes('/wiki/')
      );
      return open ? open.focus() : self.clients.openWindow(home);
    })
  );
});
