# Architecture

ATLAS // MASTER OS is a static web app built by Vite: two HTML pages plus bundled modules, served from GitHub Pages and installable as a PWA. Nothing runs on a server; user data lives in the browser (ADR-0002). The stack and its migration plan are ADR-0004.

## Layout
```text
nms-os/                          pnpm workspace
├── packages/
│   ├── core/                    @atlas/core: pure TypeScript (no DOM, no Node APIs), imported as @atlas/core/<module>
│   │   ├── src/util.ts / format.ts   escapeHtml, isPlainObject, text coercion; durations and dates
│   │   ├── src/state.ts         DEFAULT_STATE, layered merge, legacy migration, AppState type
│   │   ├── src/schema.ts        Zod schema for the state document; validateState() / describeErrors()
│   │   ├── src/systems-model.ts System type, normalisation, logbook migration, outlaw status
│   │   ├── src/planner.ts       Recipe planner over wiki/game-data.json
│   │   ├── src/search.ts        Codex search engine and labels
│   │   ├── src/game-data.ts     Zod schemas for game-data.json and recipes (shared with the wiki sync)
│   │   ├── src/slug.ts          Article file names (shared with the wiki sync)
│   │   └── test/                Vitest
│   └── wiki/                    @atlas/wiki: the mirror's sync, parser and API schema; Node runs the .ts directly
│       ├── src/sync.ts          Orchestration: sync, verify, index (pnpm sync:wiki | verify:wiki | index:wiki)
│       ├── src/wikitext.ts      Wikitext → Markdown + structured data; article frontmatter schema
│       ├── src/api-schema.ts    Zod guard for MediaWiki API responses
│       └── test/                Vitest, on real page fixtures (tests/fixtures/wikitext/)
├── apps/web/                    @atlas/web: the PWA
│   ├── index.html               Main app: Home, Systems, Outlaw Run, Calculators, Guides (6 books), More
│   ├── wiki/index.html          The Codex page, served at /wiki/ (hash routes #/?q=… and #/a/<path>)
│   ├── src/ui/                  React screens (ADR-0004 step 3): home/ so far; parts/ shared pieces; useAppState, useNow, actions
│   ├── src/app/                 Vanilla UI modules, moving to src/ui/ screen by screen
│   │   ├── main.js              Main page entry: renderAll, header search, checklists, Export/Import; mounts React screens
│   │   ├── store.ts             appState: load, validate, save, tab sync, failure banner; subscribe() for React
│   │   ├── nav.js / ui.js       Section routing + Guides; toast and haptics
│   │   ├── systems.js           Systems log + Outlaw Run UI
│   │   ├── companion.js         Device integration (keep-awake, badges, install, share)
│   │   ├── calculators.js       Calculators UI (docs/calculators.md)
│   │   ├── wiki-data.js         Wiki index/bundle loading + drafts; exports WikiSearch
│   │   └── pwa.js               Registers the service worker (production builds only)
│   ├── src/codex.js             The Codex page entry
│   ├── src/sw/sw.ts             Service worker (Workbox), built to dist/sw.js
│   ├── src/styles.css / codex.css   Each page's stylesheet: fonts.css, theme.css (+ codex-page.css), tailwind.css
│   ├── public/                  Copied into the build as-is: icons, manifest, nms_state.json, wiki → ../../../wiki
│   └── vite.config.ts           Two pages, relative base (the site lives under /nms-os/), PWA plugin
├── wiki/<category>/*.md         Mirrored wiki pages (committed) + aliases.json; derived indexes are git-ignored
├── tests/e2e/                   Playwright on the built app: desktop, phone, offline
├── docs/                        This documentation, ADRs, STATE.md, process
└── .github/workflows/pages.yml  Sync → typecheck, lint, unit → commit wiki back → build → deploy (docs/deploy.md)
```

## Runtime data flow
1. **State:** the app builds its state from built-in defaults ← `nms_state.json` (fetched) ← `localStorage` (`nms_master_os_state`), after validating each document (`validateState`), then renders every section from that single object. Every change goes through `saveAppState()`, which stamps `meta.lastUpdated`, writes `localStorage`, and re-renders.
2. **Wiki data:** the main page's header search loads the light `wiki/index.json`. The Codex page loads `wiki/offline-bundle.js` (bodies, recipes, aliases). Calculators load `wiki/game-data.json` on first open and parse it with `GameDataSchema`. All three are derived from the committed `.md` archive by `pnpm index:wiki`.
3. **Offline:** the service worker precaches the build (pages, modules, styles, icons, Latin and Greek fonts) and the wiki indexes under content-hash revisions. `nms_state.json` and `wiki/verification.json` are network-first; wiki articles are cached as they are read (docs/deploy.md).

## Module model
- `@atlas/core` is the only home for logic that doesn't touch the DOM. Its types come from its Zod schemas where data crosses a boundary (state documents, game data) and from interfaces for the normalised in-memory shapes (`AppState`, `System`).
- **Parse, don't cast:** anything read from outside the code is parsed before use: imports, `localStorage`, `nms_state.json`, `game-data.json`, wiki API responses and article frontmatter. Remaining unparsed inputs are listed in `docs/STATE.md`.
- The remaining vanilla UI modules render string templates. Only `store.ts` reassigns `appState`; other modules read the live binding, mutate it, and call `saveAppState()`, which re-renders through the hook `main.js` registers (`onSave`). `nav.js` lets features react to a section opening through `onSection()`, which avoids import cycles.
- Inline `on…=""` handlers run in the global scope, so each module exposes exactly the functions its markup and templates call with `Object.assign(window, {…})`. `tests/unit/inline-handlers.test.mjs` fails if a handler calls anything not exposed.

## React screens (ADR-0004 step 3)
- Each moved screen lives in `apps/web/src/ui/<screen>/` and is mounted once into a container in `index.html` (`#homeRoot` for Home) from `main.js`, after the state loads. The vanilla page around it is unchanged.
- **State:** `useAppState()` returns the live `appState` and re-renders on every change. The store mutates one object in place, so React subscribes to `getVersion()` through `useSyncExternalStore`; the version moves after every load, save and adopted tab copy. Components change state only through actions (`src/ui/actions.ts`) that mutate, `saveAppState()` and confirm.
- **What a screen shows** is computed by a pure function in `@atlas/core` (e.g. `homeSummary()`), unit-tested; components only render it. `useNow()` supplies the clock (every minute and on returning to the app).
- **Calling vanilla code** (the Systems panel and editor) goes through direct imports typed by `src/app/systems.d.ts`, never `window`.
- Tests: component tests next to the screen (`*.test.tsx`, Vitest + Testing Library in happy-dom); axe gates every moved screen (`tests/e2e/a11y.spec.mjs`).

## Styling
- Tailwind v4 is compiled at build time. The markup was written for Tailwind v3's CDN, so `tailwind.css` keeps v3's preflight (`tailwind-v3-preflight.css`), its text line heights and its `space-y-*` behaviour (`tailwind-v3-spacing.css`), and imports Tailwind after the app's CSS without cascade layers, as the CDN did. These shims go when the screens move to React.
- Fonts (Inter, Orbitron, JetBrains Mono) and Phosphor icons are bundled from npm; nothing loads from a CDN.

## External boundaries
- **Wiki API** (`nomanssky.fandom.com/api.php`): read-only, called only by the wiki sync in CI or locally. Never from the browser.
- **No CDNs at run time.** Every library is bundled and pinned by `pnpm-lock.yaml`.
- **No backend, no telemetry, no third-party data sharing.** Export/Import is the only way user data leaves a device (ADR-0002).
