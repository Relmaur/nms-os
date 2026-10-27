# AGENTS.md — ATLAS // MASTER OS Architecture & Context Protocol

## 1. Project Overview
**ATLAS // MASTER OS** is a local-first, zero-build web application and interactive knowledge repository for a cross-save *No Man's Sky* playthrough (PC, Mac, Switch, iOS).
- **Commit Baseline:** Fixing truncated `index.html` from commit `39df05c99c2f7bef39caf4e207f17161b23efd9b`.
- **Stack:** Vanilla HTML5, Tailwind CSS (CDN), Alpine.js (CDN) or clean modular ES6 JavaScript. Zero heavy bundler required so it runs instantly via `npx serve .` or `python3 -m http.server 8080`.

### Repository layout
```text
nms-os/
├── index.html              # Main app: Home, Systems, Outlaw Run, Calculators, Guides (6 books), More; state sync, global search
├── manifest.webmanifest    # PWA manifest (name, icons, standalone display, shortcuts)
├── sw.js                   # Service worker: offline app shell + wiki + CDN libraries
├── .github/workflows/pages.yml  # Syncs + verifies the wiki mirror and deploys to GitHub Pages
├── assets/
│   ├── pwa.js              # Registers sw.js (both pages); no-op on file:// and plain-http LAN
│   ├── icons/              # App icons (svg source + 192/512/maskable/apple-touch PNGs)
│   ├── theme.js / theme.css # Shared Tailwind config + styles for every page
│   ├── wiki-search.js      # Shared Codex data loading + full-text search engine (window.WikiSearch)
│   ├── systems.js          # Systems log + Outlaw Run (model, migration, list/filters, detail panel)
│   ├── calculators.js      # Calculators on wiki/game-data.json: recipe planner, base value, mineral extractors
│   ├── companion.js        # Home screen + device integration (keep-awake, app badge, haptics, share, install, swipe-to-close)
├── nms_state.json          # Shared state (meta, fleet, checklists, systems, outlaw)
├── AGENTS.md               # This file
├── package.json            # npm start | sync:wiki | verify:wiki | index:wiki
├── scripts/
│   └── sync-wiki.mjs       # Zero-dependency wiki mirror: sync, verify, index (Node 18+)
└── wiki/                   # The .md archive + aliases.json are COMMITTED; index.json, offline-bundle.js, game-data.json, verification.json are derived
    ├── index.html          # COMMITTED: the Codex page, served at /wiki/ (hash routes #/?q=… and #/a/<path>)
    ├── index.json          # Search manifest { title, slug, category, path, summary, source, url? }
    ├── offline-bundle.js   # Same articles with bodies, loaded only when fetch() fails (file://)
    ├── resources/ products/ cooking/ fish/ building/ technology/ places/ missions/ galaxies/ updates/   # <slug>.md, one per wiki page
    ├── aliases.json        # Old item names the wiki redirects ("Rigogen" → "Kelp Sac"), used to resolve recipe ingredients
    ├── game-data.json      # Structured dataset for deterministic tools: fields, value, recipes per page (derived)
    ├── verification.json   # Result of the last sync/verify against the live wiki (derived; shown in the Codex)
    └── custom/<category>/  # COMMITTED hand-written articles
```

**Fresh clone:** run `npm run index:wiki` (no network needed) to rebuild the derived files from the committed archive, then `npm start`.

## 2. Shared State Protocol (`nms_state.json`)
The application state MUST be serializable to and from `nms_state.json` at the repository root.
- On load, `index.html` attempts to `fetch('./nms_state.json')` to hydrate initial state, merging with `localStorage.getItem('nms_master_os_state')`.
- Provide an **"Export nms_state.json"** button and **"Import nms_state.json"** file dropzone in the top header.

### Default `nms_state.json` Schema:
See [`nms_state.json`](./nms_state.json) at the repository root — it is the canonical default and the shape every export/import must follow:

- `meta` — `version`, `lastUpdated`, `platforms`, `currentPhase`
- `fleet` — `primaryStarship`, `salvageStarship`, `multiTools[]`
- `checklists` — flat map of `id -> boolean` (named milestones such as `crossSaveLinked`, plus guide checklist item ids such as `cs1`, `rm3`)
- `systems[]` — `{ id, name, galaxy, region, glyphs (12 hex or ''), star (yellow|red|green|blue|purple|''), race (gek|korvax|vykeen|none|abandoned|''), economy, wealth (0–3), conflict (low|medium|high|pirate|''), tags: string[], favorite, rating (0–5), notes, planets: [{ id, name, biome, tags, notes }], visits: [{ at: ISO, note?, packets? }], createdAt }`. Tags are lowercase slugs (`trade-hub`).
- `outlaw` — `{ restockHours, packetsPerVisit, runSize, unitsPerPacket, nanitesPerPacket }`. The last two are the player's own in-game averages (packet prices and contents aren't fixed game data). Outlaw stations are systems tagged `outlaw`; one counts as ready once `restockHours` have passed since its last visit with `packets`.
- Legacy keys `logbook[]` and `outlaw.stations[]` are migrated into `systems[]` by `migrateToSystems()` (assets/systems.js) on load and import; ids are kept so re-merging never duplicates.

### Merge rules
- Precedence: built-in defaults ← `nms_state.json` ← `localStorage`. If `nms_state.json`'s `meta.lastUpdated` is newer than the browser copy (e.g. after a `git pull` from another machine), the file wins instead.
- Objects merge key-by-key; arrays (`systems`, `multiTools`, slot lists) are replaced wholesale.
- Data from the pre-2.0 key `ATLAS_MASTER_OS_STATE_V2` (`checkedItems` / `logEntries`) is migrated automatically on load and on import.

## 3. Wiki mirror & Codex (`wiki/`)
The Codex is a verified mirror of the **game-data pages** of the No Man's Sky Wiki (`nomanssky.fandom.com`), nothing else: no hand-written or community-guide content is mixed in.
- **Scope:** main-namespace pages that use one of these infoboxes: Resource, Product, Technology, Technology NEXT, POI, Space Encounter, Mission, Milestone, Galaxy, Update (`SCOPE` in `scripts/sync-wiki.mjs`). Player discoveries (planets, creatures, bases, player-found ships/tools) have other infoboxes and are out of scope. Legacy Technology pages whose type is "provides N slots" are player-found multi-tools and are excluded.
- **Rendering:** every article is generated from the page's wikitext at a recorded revision (`revId`), not from rendered HTML: infobox → "Quick Facts", recipe templates (`Craft`, `CraftObsolete`, `PoC-Refine`, `Cook`, `PoC-Repair`, `PoC-Dismantle`) → recipe lines + structured `data.recipes`, links → `[[Target]]` / `[[Target|label]]`. Dynamic wiki queries (`UseQueries`, `Query Cooking`, navboxes) render as nothing; the Codex computes "Used in" from the recipes instead.
- **Matching:** wiki revisions are immutable, so archived `revId` == live `revId` means the copy matches the wiki's source exactly. `npm run verify:wiki` is a dry-run sync: it rebuilds every article from the live wiki and reports anything that would change (exit 1 if any). `npm run sync:wiki` applies it; a second sync writes nothing. Both write `wiki/verification.json`.
- **Flags, never silent deletes:** pages the wiki marks `{{Obsolete}}` or keeps for an older version ("Blaze Javelin (Atlas)") get `obsolete: true` and are hidden by default. A page that leaves the wiki or loses its game-data infobox keeps its last copy with `status: "removed"`.
- **Currency:** each page's `version` is the wiki's own `{{Version|…}}` stamp ("up to date as of the X update"). The mirror can claim to match the wiki; only this stamp speaks to whether the wiki matches the current game.
- Frontmatter: `title`, `category`, `kind`, `summary` (the in-game description when the page quotes it), `pageId`, `revId`, `revTimestamp`, `version`, `obsolete`, `status`, `source` (live URL), `license`, `data` (`{ fields, value?, recipes }`). Strings and objects are JSON, which is valid YAML.
- Folders come from the infobox (`categoryFor()`): resources, products, cooking, fish, building, technology, places, missions, galaxies, updates. Do not edit mirrored files by hand: the next sync overwrites them. Text is CC BY-SA 3.0 (No Man's Sky Wiki contributors).
- `npm run index:wiki` rebuilds `index.json` (light: what the main app's header search shows), `offline-bundle.js` (bodies + recipes + aliases, for the Codex) and `game-data.json` (one record per wiki page with fields, value and recipes, the dataset for deterministic tools).
- Your own articles live in `wiki/custom/<category>/`, show as "Your articles", and are never part of the match.
- Codex page (`wiki/index.html`): verification panel, recently edited pages, faceted category/source/A–Z filters, "Include no longer in game" toggle (`old=1`), quick look (↑/↓, Space, Enter), and an article view with the wiki revision (linked to that exact revision), TOC, "Used in", outgoing links, "Mentioned in" and category neighbours. The main app's header search uses `index.json`, skips obsolete/removed pages, and deep-links into `wiki/#/a/<path>`.

## 4. Installable App & Deployment (GitHub Pages)
- Navigation is companion-first. Sections are hash routes: `#home` (default), `#systems`, `#outlaw`, `#calculators`, `#guides`, `#book1`…`#book6`, `#more`; `#new-system` opens the Add-system editor (home-screen shortcut). Below `lg` a bottom tab bar (Home · Systems · Outlaw · Codex · More) replaces the sidebar; `wiki/index.html` carries the same bar.
- Edge-to-edge: `viewport-fit=cover` + `black-translucent` status bar, so fixed/sticky chrome pads with `env(safe-area-inset-*)` (see the App shell block in `theme.css`).
- Device features (`assets/companion.js`) are feature-detected and degrade silently: Screen Wake Lock ("Keep screen on", stored per device in `localStorage` key `atlas_keep_awake`, not in `nms_state.json`), app-icon badge = ready outlaw stations, `navigator.vibrate` haptics (Android), Web Share for a system, the install prompt, and `navigator.storage.persist()` when installed.
- Live build: `.github/workflows/pages.yml` runs on every push to `main`, weekly (Mondays 06:17 UTC, to refresh the wiki) and on demand. It runs `node scripts/sync-wiki.mjs` (sync + verification; if the wiki is unreachable the committed archive ships and `verification.json` says so), commits any changed wiki pages back to `main` as `github-actions[bot]` ("Sync wiki mirror: N page(s) changed"), stamps `BUILD` in `sw.js`, and publishes only `index.html`, `nms_state.json`, `manifest.webmanifest`, `sw.js`, `assets/` and `wiki/`. One-time setup: Settings → Pages → Source: **GitHub Actions**.
- Site URL: `https://relmaur.github.io/nms-os/`. Every path in the app is relative so it works under that subpath.
- Service worker strategy: pages and `nms_state.json` are network-first (3.5s timeout for pages) with cache fallback; other same-origin files and CDN libraries are stale-while-revalidate. Each deploy gets a new shell cache (`atlas-os-shell-<BUILD>`); old ones are deleted on activate.
- When adding a new file the app needs offline, add it to `SHELL` in `sw.js`. When adding or bumping a CDN library, update `CDN_PRECACHE` (and `CDN_HOSTS` for a new host).
- Service workers only run on HTTPS or `localhost`. Over `file://` or a plain-http LAN address the app works online-only.
- `nms_state.json` is published with the site. Edits made on a phone stay in that phone's browser storage; use Export/Import to move them, and commit the exported file to update the shared copy.
- Icons: edit `assets/icons/icon.svg` / `icon-maskable.svg` (Phosphor "planet" fill), then re-render the PNGs at 192, 512, 512 (maskable) and 180 (apple-touch).

## 5. Calculators (`assets/calculators.js`)
- Built only on the wiki mirror: `wiki/game-data.json` is fetched when the Calculators section first opens (precached by the service worker). Every number shown is wiki data, arithmetic on it, or an input the player sets; never a hand-typed game fact.
- Recipe planner: expands crafting and cooking recipes (not refining, which is a way to obtain raw materials) down to items with no such recipe. Skips self-multiplying recipes, guards against cycles, rounds up to whole batches for multi-output crafts, and lets the player cycle alternative recipes per item. Values are the wiki's base values.
- Harmonic Camp registers are plain arithmetic (`safeMathEval` in `index.html`).
