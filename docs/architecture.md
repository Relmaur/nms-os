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
│   ├── lib/                # Pure ES modules (no DOM), unit-tested in Node
│   │   ├── util.js / format.js   # escapeHtml, isPlainObject; durations and dates
│   │   ├── state.js        # DEFAULT_STATE, layered merge, legacy migration
│   │   ├── systems-model.js # System normalisation, logbook migration, outlaw status
│   │   ├── planner.js      # Recipe planner over wiki/game-data.json
│   │   └── search.js       # Codex search engine and labels
│   ├── app/                # UI modules (DOM)
│   │   ├── main.js         # Main page entry: renderAll, header search, checklists, Export/Import
│   │   ├── store.js        # appState: load, save, render hook
│   │   ├── nav.js / ui.js  # Section routing + Guides; toast and haptics
│   │   ├── systems.js      # Systems log + Outlaw Run UI
│   │   ├── companion.js    # Home screen + device integration
│   │   ├── calculators.js  # Calculators UI (docs/calculators.md)
│   │   └── wiki-data.js    # Wiki index/bundle loading + drafts; exports WikiSearch
│   ├── theme.js / theme.css # Shared Tailwind CDN config + styles (classic script)
│   ├── pwa.js              # Registers sw.js (classic script)
│   └── icons/
├── wiki/codex.js           # The Codex page module
├── scripts/sync-wiki.mjs   # Wiki mirror orchestration: sync, verify, index; parsing in scripts/lib/wikitext.mjs
├── wiki/<category>/*.md    # Mirrored wiki pages (committed) + aliases.json
├── docs/                   # This documentation, ADRs, STATE.md, process
└── .github/workflows/pages.yml  # Verify → build → deploy; weekly wiki sync (docs/deploy.md)
```

## Runtime data flow
1. **State:** `index.html` builds the app state from built-in defaults ← `nms_state.json` (fetched) ← `localStorage` (`nms_master_os_state`), then renders every section from that single object. Every change goes through `saveAppState()`, which stamps `meta.lastUpdated`, writes `localStorage`, and re-renders.
2. **Wiki data:** the main page's header search loads the light `wiki/index.json`. The Codex page loads `wiki/offline-bundle.js` (bodies, recipes, aliases). Calculators load `wiki/game-data.json` on first open. All three are derived from the committed `.md` archive by `npm run index:wiki`.
3. **Offline:** `sw.js` precaches the shell, the wiki indexes and the CDN libraries. Pages and `nms_state.json` are network-first; everything else is stale-while-revalidate.

## Script model (ADR-0001)
- Both pages load one ES module entry (`assets/app/main.js`, `wiki/codex.js`); dependencies are explicit imports. ES modules need an HTTP origin, so the app runs from `npm start`, the live site, or the installed PWA, not from `file://`.
- `assets/lib/` is pure and imported by Node tests as-is. `assets/app/` touches the DOM.
- Only `store.js` reassigns `appState`; other modules read the live binding, mutate it, and call `saveAppState()`, which re-renders through the hook `main.js` registers (`onSave`). `nav.js` lets features react to a section opening through `onSection()`, which avoids import cycles.
- Inline `on…=""` handlers run in the global scope, so each module exposes exactly the functions its markup and templates call with `Object.assign(window, {…})`. `tests/unit/inline-handlers.test.mjs` fails if a handler calls anything not exposed.
- Every module must be listed in `SHELL` in `sw.js`; `tests/unit/sw-shell.test.mjs` walks the import graph and checks this.

## External boundaries
- **Wiki API** (`nomanssky.fandom.com/api.php`): read-only, called only by `scripts/sync-wiki.mjs` in CI or locally. Never from the browser.
- **CDNs:** Tailwind, Phosphor icons, marked, DOMPurify, Google Fonts (`CDN_PRECACHE` in `sw.js`).
- **No backend, no telemetry, no third-party data sharing.** Export/Import is the only way user data leaves a device (ADR-0002).
