// Service worker: makes ATLAS // MASTER OS installable and fully usable offline.
// BUILD is stamped by .github/workflows/pages.yml so every deploy gets a fresh app-shell cache.
const BUILD = 'dev';
const SHELL_CACHE = `atlas-os-shell-${BUILD}`;
const RUNTIME_CACHE = 'atlas-os-runtime';
const NAVIGATION_TIMEOUT_MS = 3500;

const SHELL = [
    './',
    'index.html',
    'wiki/',
    'wiki/index.html',
    'manifest.webmanifest',
    'nms_state.json',
    'assets/theme.css',
    'assets/theme.js',
    // ES modules: every file a page imports must be listed, or it isn't available offline until first visited.
    'assets/lib/util.js',
    'assets/lib/format.js',
    'assets/lib/state.js',
    'assets/lib/systems-model.js',
    'assets/lib/planner.js',
    'assets/lib/search.js',
    'assets/lib/schema.js',
    'assets/app/main.js',
    'assets/app/store.js',
    'assets/app/ui.js',
    'assets/app/nav.js',
    'assets/app/wiki-data.js',
    'assets/app/systems.js',
    'assets/app/companion.js',
    'assets/app/calculators.js',
    'wiki/codex.js',
    'assets/pwa.js',
    'assets/icons/icon.svg',
    'assets/icons/icon-192.png',
    'assets/icons/icon-512.png',
    'assets/icons/apple-touch-icon.png',
    'wiki/index.json',
    'wiki/offline-bundle.js',
    'wiki/game-data.json'
];

// Libraries the pages load from CDNs. Fetched up front so the first install already works offline;
// anything they pull in later (Phosphor's font files, Google Fonts) is cached on first use.
const CDN_PRECACHE = [
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/@phosphor-icons/web',
    'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js',
    'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Orbitron:wght@500;700;900&family=JetBrains+Mono:wght@400;500;600&display=swap'
];
const CDN_HOSTS = new Set(['cdn.tailwindcss.com', 'unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com']);

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const shell = await caches.open(SHELL_CACHE);
        const runtime = await caches.open(RUNTIME_CACHE);
        // allSettled: a missing optional file (e.g. no wiki built yet) must not block installation.
        // CDN responses are opaque (status 0), which cache.add() rejects, so fetch + put them instead.
        await Promise.allSettled([
            ...SHELL.map(url => shell.add(new Request(url, { cache: 'reload' }))),
            ...CDN_PRECACHE.map(async url => {
                const request = new Request(url, { mode: 'no-cors' });
                await runtime.put(request, await fetch(request));
            })
        ]);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys
            .filter(key => key.startsWith('atlas-os-shell-') && key !== SHELL_CACHE)
            .map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, SHELL_CACHE, NAVIGATION_TIMEOUT_MS));
    } else if (sameOrigin && url.pathname.endsWith('/nms_state.json')) {
        event.respondWith(networkFirst(request, SHELL_CACHE));
    } else if (sameOrigin) {
        event.respondWith(staleWhileRevalidate(request, SHELL_CACHE, event));
    } else if (CDN_HOSTS.has(url.hostname)) {
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, event));
    }
});

// Pages and the shared state file: always try for the latest, fall back to the cached copy offline.
async function networkFirst(request, cacheName, timeoutMs) {
    const cache = await caches.open(cacheName);
    try {
        const network = fetch(request);
        const response = await (timeoutMs
            ? Promise.race([network, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))])
            : network);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (err) {
        const cached = await cache.match(request, { ignoreSearch: true })
            || (request.mode === 'navigate' && await cache.match(new URL(request.url).pathname.endsWith('/wiki/') ? 'wiki/' : './'));
        if (cached) return cached;
        throw err;
    }
}

// Everything else: answer instantly from cache, refresh in the background for next time.
async function staleWhileRevalidate(request, cacheName, event) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const refresh = fetch(request)
        .then(response => {
            if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
            return response;
        })
        .catch(() => cached);
    if (cached) {
        event.waitUntil(refresh);
        return cached;
    }
    return refresh;
}
