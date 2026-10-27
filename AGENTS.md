# AGENTS.md — ATLAS // MASTER OS Architecture & Context Protocol

## 1. Project Overview
**ATLAS // MASTER OS** is a local-first, zero-build web application and interactive knowledge repository for a cross-save *No Man's Sky* playthrough (PC, Mac, Switch, iOS).
- **Commit Baseline:** Fixing truncated `index.html` from commit `39df05c99c2f7bef39caf4e207f17161b23efd9b`.
- **Stack:** Vanilla HTML5, Tailwind CSS (CDN), Alpine.js (CDN) or clean modular ES6 JavaScript. Zero heavy bundler required so it runs instantly via `npx serve .` or `python3 -m http.server 8080`.

### Repository layout
```text
nms-os/
├── index.html              # Main app: 6 Books, 5 calculators, logbook, state sync, global search
├── manifest.webmanifest    # PWA manifest (name, icons, standalone display, shortcuts)
├── sw.js                   # Service worker: offline app shell + wiki + CDN libraries
├── .github/workflows/pages.yml  # Builds the wiki and deploys to GitHub Pages
├── assets/
│   ├── pwa.js              # Registers sw.js (both pages); no-op on file:// and plain-http LAN
│   ├── icons/              # App icons (svg source + 192/512/maskable/apple-touch PNGs)
│   ├── theme.js / theme.css # Shared Tailwind config + styles for every page
│   └── wiki-search.js      # Shared Codex data loading + full-text search engine (window.WikiSearch)
├── nms_state.json          # Shared state (meta, fleet, checklists, logbook)
├── AGENTS.md               # This file
├── package.json            # npm start | sync:wiki | seed:wiki | index:wiki
├── scripts/
│   ├── sync-wiki.mjs       # Zero-dependency MediaWiki → .md harvester + indexer (Node 18+)
│   └── seed-articles.mjs   # Curated offline starter articles
└── wiki/                   # GIT-IGNORED except index.html + custom/ — rebuild with `npm run sync:wiki`
    ├── index.html          # COMMITTED: the Codex page, served at /wiki/ (hash routes #/?q=… and #/a/<path>)
    ├── index.json          # Search manifest { title, slug, category, path, summary, source, url? }
    ├── offline-bundle.js   # Same articles with bodies, loaded only when fetch() fails (file://)
    ├── resources/ products/ cooking/ technology/ guides/   # generated <slug>.md (seeds + harvest)
    └── custom/<category>/  # COMMITTED hand-written articles
```

**Fresh clone:** run `npm run sync:wiki` (or `npm run seed:wiki` offline), then `npm start`. Never commit generated `wiki/` files — each re-sync rewrites ~700 files.

## 2. Shared State Protocol (`nms_state.json`)
The application state MUST be serializable to and from `nms_state.json` at the repository root.
- On load, `index.html` attempts to `fetch('./nms_state.json')` to hydrate initial state, merging with `localStorage.getItem('nms_master_os_state')`.
- Provide an **"Export nms_state.json"** button and **"Import nms_state.json"** file dropzone in the top header.

### Default `nms_state.json` Schema:
See [`nms_state.json`](./nms_state.json) at the repository root — it is the canonical default and the shape every export/import must follow:

- `meta` — `version`, `lastUpdated`, `platforms`, `currentPhase`
- `fleet` — `primaryStarship`, `salvageStarship`, `multiTools[]`
- `checklists` — flat map of `id -> boolean` (named milestones such as `crossSaveLinked`, plus guide checklist item ids such as `cs1`, `rm3`)
- `logbook[]` — `{ id, system, type, glyphSolution: number[], notes }`

### Merge rules
- Precedence: built-in defaults ← `nms_state.json` ← `localStorage`. If `nms_state.json`'s `meta.lastUpdated` is newer than the browser copy (e.g. after a `git pull` from another machine), the file wins instead.
- Objects merge key-by-key; arrays (`logbook`, `multiTools`, slot lists) are replaced wholesale.
- Data from the pre-2.0 key `ATLAS_MASTER_OS_STATE_V2` (`checkedItems` / `logEntries`) is migrated automatically on load and on import.

## 3. Local Wiki Codex (`wiki/`)
- `npm run sync:wiki` — writes the seed articles, harvests the No Man's Sky Fandom wiki (`nomanssky.fandom.com/api.php`), then rebuilds `wiki/index.json` + `wiki/offline-bundle.js`. Add `-- --limit=25` for a quick run.
- `npm run seed:wiki` — seeds + reindex, no network.
- `npm run index:wiki` — reindex only. Run after adding or editing any `.md` file by hand.
- Category mapping (real Fandom categories): `Raw_Materials` → resources, `Products_-_Component` + `Trade_commodity` → products, `Edible_Product` → cooking, `Technology` → technology, `Mechanics` → guides.
- Frontmatter: `title`, `category`, `summary`, `source` (`"seed"`, `"custom"` or the original page URL), `updated`, and for harvested pages `pageId` + `license`. String values are JSON-quoted, which is valid YAML.
- A harvested page whose slug collides with a seed article is saved as `<slug>_wiki.md`, so both are kept.
- Harvested text is CC BY-SA 3.0 (No Man's Sky Wiki contributors). Keep the `source`/`license` frontmatter when editing.
- Custom articles live in `wiki/custom/<category>/` (committed, alongside `wiki/index.html`) and are tagged `custom` in the index. Never `rm -rf wiki/` to reset — delete only the generated folders.
- Codex page (`wiki/index.html`): loads `offline-bundle.js` for full-text search; faceted category/source/A–Z filters with live counts, 20 results per page, quick-look panel (↑/↓, Space, Enter), article view with TOC, outgoing links, "Mentioned in" backlinks and category neighbours. The main page's header search uses the light `index.json` and deep-links into `wiki/#/a/<path>`.
- Search ranks title > summary > headings > body > fuzzy title subsequence, with simple plural folding. `[[Article Title]]` in Markdown links to that local article. Rendered Markdown is sanitized with DOMPurify. "Create Custom .MD Article" downloads the file and keeps a browser draft until the file is indexed.

## 4. Installable App & Deployment (GitHub Pages)
- Live build: `.github/workflows/pages.yml` runs on every push to `main`, weekly (Mondays 06:17 UTC, to refresh the wiki) and on demand. It runs `node scripts/sync-wiki.mjs`, stamps `BUILD` in `sw.js`, and publishes only `index.html`, `nms_state.json`, `manifest.webmanifest`, `sw.js`, `assets/` and `wiki/`. One-time setup: Settings → Pages → Source: **GitHub Actions**.
- Site URL: `https://relmaur.github.io/nms-os/`. Every path in the app is relative so it works under that subpath.
- Service worker strategy: pages and `nms_state.json` are network-first (3.5s timeout for pages) with cache fallback; other same-origin files and CDN libraries are stale-while-revalidate. Each deploy gets a new shell cache (`atlas-os-shell-<BUILD>`); old ones are deleted on activate.
- When adding a new file the app needs offline, add it to `SHELL` in `sw.js`. When adding or bumping a CDN library, update `CDN_PRECACHE` (and `CDN_HOSTS` for a new host).
- Service workers only run on HTTPS or `localhost`. Over `file://` or a plain-http LAN address the app works online-only.
- `nms_state.json` is published with the site. Edits made on a phone stay in that phone's browser storage; use Export/Import to move them, and commit the exported file to update the shared copy.
- Icons: edit `assets/icons/icon.svg` / `icon-maskable.svg` (Phosphor "planet" fill), then re-render the PNGs at 192, 512, 512 (maskable) and 180 (apple-touch).
