# Architecture

ATLAS // MASTER OS is a static, build-free web app: two HTML pages plus scripts, served from GitHub Pages and installable as a PWA. Nothing runs on a server; user data lives in the browser. See ADR-0002 for why.

## Layout
```text
nms-os/
├── index.html              # Main app shell: Home, Systems, Outlaw Run, Calculators, Guides (6 books), More
├── wiki/index.html         # The Codex page, served at /wiki/ (hash routes #/?q=… and #/a/<path>)
├── manifest.webmanifest    # PWA manifest (icons, standalone display, shortcuts)
├── sw.js                   # Service worker: offline app shell + wiki + CDN libraries
├── nms_state.json          # Canonical default state (docs/state-schema.md)
├── assets/
│   ├── theme.js / theme.css # Shared Tailwind CDN config + styles for both pages
│   ├── pwa.js              # Registers sw.js; no-op on file:// and plain-http LAN
│   ├── wiki-search.js      # Codex data loading + full-text search (window.WikiSearch)
│   ├── systems.js          # Systems log + Outlaw Run: model, migration, list/filters, detail panel
│   ├── companion.js        # Home screen + device integration (wake lock, badge, haptics, share, install)
│   ├── calculators.js      # Calculators on wiki/game-data.json (docs/calculators.md)
│   └── icons/
├── scripts/sync-wiki.mjs   # Wiki mirror: sync, verify, index (docs/wiki-mirror.md)
├── wiki/<category>/*.md    # Mirrored wiki pages (committed) + aliases.json
├── docs/                   # This documentation, ADRs, STATE.md, process
└── .github/workflows/pages.yml  # Verify → build → deploy; weekly wiki sync (docs/deploy.md)
```

## Runtime data flow
1. **State:** `index.html` builds the app state from built-in defaults ← `nms_state.json` (fetched) ← `localStorage` (`nms_master_os_state`), then renders every section from that single object. Every change goes through `saveAppState()`, which stamps `meta.lastUpdated`, writes `localStorage`, and re-renders.
2. **Wiki data:** the main page's header search loads the light `wiki/index.json`. The Codex page loads `wiki/offline-bundle.js` (bodies, recipes, aliases). Calculators load `wiki/game-data.json` on first open. All three are derived from the committed `.md` archive by `npm run index:wiki`.
3. **Offline:** `sw.js` precaches the shell, the wiki indexes and the CDN libraries. Pages and `nms_state.json` are network-first; everything else is stale-while-revalidate.

## Script model
Today the main page runs classic scripts (`systems.js`, `companion.js`, `calculators.js`) plus one large inline script, all sharing the global scope; inline `onclick` handlers call globals. Release 3.0.0 moves pure logic into ES modules under `assets/lib/` (unit-tested in Node) and UI code into `assets/app/` (ADR-0001).

## External boundaries
- **Wiki API** (`nomanssky.fandom.com/api.php`): read-only, called only by `scripts/sync-wiki.mjs` in CI or locally. Never from the browser.
- **CDNs:** Tailwind, Phosphor icons, marked, DOMPurify, Google Fonts (`CDN_PRECACHE` in `sw.js`).
- **No backend, no telemetry, no third-party data sharing.** Export/Import is the only way user data leaves a device (ADR-0002).
