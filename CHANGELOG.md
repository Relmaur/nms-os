# Changelog

All notable changes to ATLAS // MASTER OS. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/). For this app, a MAJOR bump means a saved or exported `nms_state.json`, a bookmarked URL, or a supported way of running the app stops working.

Versions up to 2.6.0 were reconstructed from git history when the changelog was introduced.

## [Unreleased]

## [3.8.0] - 2026-10-27
### Changed
- The main page's frame is React: the header with its search, Export and Import, the sidebar, the tab bar and the storage banner (ADR-0004 step 3, now complete). It works as before, at the same addresses; it now shows at once instead of waiting for your log to load.
- The Codex landing and the system panel on desktop lose a stray gap above their titles, and small labels sit a pixel or two tighter: Tailwind's own base styles replace the v3 compatibility layer.
### Fixed
- A search typed in the header before the wiki index had loaded never showed wiki results; they now fill in when the index arrives.
- Picking a guide passage in the header search could open its book at the top instead of at the passage; it now scrolls there.
- ArrowUp in the header search with nothing highlighted now goes to the last result (it went to the second-to-last).
- Accessibility: Systems and Outlaw Run have a top-level heading, and the whole page (header, sidebar, tab bar) is axe-gated in `pnpm check`.
### Internal
- `main.js`, `nav.js` and `companion.js` are gone, with every inline `on…=""` handler and the `window` exports; a test keeps handlers from coming back. Section routing is `src/ui/shell/section-store.ts`; systems search is `searchSystems()` in `@atlas/core`.
- The Tailwind v3 shims are gone (`tailwind-v3-preflight.css`, `tailwind-v3-spacing.css`, the fixed line heights), checked with a before/after screenshot diff of every screen.

## [3.7.1] - 2026-10-27
### Fixed
- "Keep screen on" sometimes took two taps to turn on. When the system had let the screen sleep (battery saver, a moment away from the app), the first tap switched off a setting that still read as on. A tap now always flips what the switch shows.
### Internal
- The phone sheet drag test waits for the sheet to finish sliding in before touching its bar; under load it sometimes measured mid-slide and missed.

## [3.7.0] - 2026-10-27
### Changed
- Guides, the six books and More are React screens (ADR-0004 step 3). They read and work as before, at the same addresses (`#guides`, `#book1`–`#book6`, `#more`); the books' text is unchanged.
- The header search's "In the manual" results come from the six books only; headings elsewhere on the page no longer show up there.
### Fixed
- Checklist steps in the books are real checkboxes: they can be ticked from the keyboard, and screen readers announce them as checked or not.
- Accessibility: Guides, Book I, Book III and More are axe-gated in `pnpm check`. Book section headings follow the book's title in order, and a table wider than a phone scrolls in a box you can reach with the keyboard.
### Internal
- The books and their checklists, and checklist progress, live in `@atlas/core/guides` with unit tests. Export/Import is a typed module (`src/app/backup.ts`) shared by More and the header; keep-awake, install and storage protection are one store (`src/ui/more/device-store.ts`) shared by More and Home.

## [3.6.0] - 2026-10-27
### Changed
- Codex articles put their index first on phones: right under the title, a row shows Contents, Used in, Links to, Mentioned in and Nearby with their counts, each opening a drawer at that list. Once you scroll past it, a strip under the header shows the section you're in and keeps the index one tap away. On wide screens the index stays the right-hand column.
- Every drawer on a phone closes the same way: tap its bar, or swipe it down (or tap outside, or Esc). The ✕ buttons are gone on phones; wider screens keep them. The system editor can be swiped closed too, but not while it has unsaved changes, and neither can a new Codex article with text in it.
- The Codex is a React page (ADR-0004 step 3). It looks and works as before: the same addresses, search, filters, quick look, keyboard shortcuts and drafts.
### Fixed
- Accessibility: the Codex is axe-gated in `pnpm check` (landing, results, quick look, article and its index), fixing its earlier findings (invalid list roles and attributes, an unnamed dialog, an empty heading).
### Internal
- The Codex's routes, filters and article relations are pure functions in `@atlas/core/codex` with unit tests. `wiki/index.json`, `offline-bundle.js`, `verification.json` and drafts are parsed with Zod schemas (`@atlas/core/wiki-files`) before use.
- `codex.js` and its `window` functions are gone; one shared Sheet component drives every phone drawer.

## [3.5.0] - 2026-10-27
### Changed
- Calculators opens on the recipe planner, with a dock at the top to switch between the planner, Base value, Extractors and Registers in one tap, without scrolling past the plan. The planner leads the dock and shows the plan in progress ("×1 Stasis Device · 3/14 gathered"). Switching keeps what you typed in each tool, and the chosen tool stays while the app is open.
- A planner tick now stays when what you gathered or crafted still covers a smaller need after a change of amount or recipe (500 Radon gathered covers a need of 300). A larger need still starts that tick fresh.
### Fixed
- The planner said "1 crafts in 1 rounds"; it now says "1 craft in 1 round". A long item name in the picker ends in an ellipsis instead of being cut off.

## [3.4.0] - 2026-10-27
### Changed
- The recipe planner is a build order instead of an indented tree. The product sits at the top with its worth against the raw inputs; below it, crafts are grouped into rounds (round 1 needs only raw materials); at the bottom, the raw materials wait in a cargo hold. Each intermediate appears once with its total.
- Tick off what you've gathered and crafted: a round lights up once its inputs are ticked. Ticks are kept on this device and are not part of your saved file. Changing the amount or a recipe keeps every tick whose amount is still needed; a new item starts fresh.
- Each alternative-recipe switch shows what the next recipe uses and how it changes the raw inputs' value before you tap it. The product's worth is compared with its raw inputs ("Worth 148× its raw inputs"). Large values read in billions ("1.56B Units").
- Calculators is a React screen (ADR-0004 step 3); its accessibility is checked (axe) in `pnpm check`.
### Fixed
- An intermediate used in several places was batched separately in each, which could overstate raw materials for multi-output crafts; it is now batched once on its total.
- The Harmonic Camp registers no longer evaluate what you type as code; they parse arithmetic only.
### Internal
- `PRODUCT.md` (product truth for design work) and the planner's design brief in `apps/web/.impeccable/`.

## [3.3.0] - 2026-10-27
### Changed
- Systems, the system panel (view and editor) and Outlaw Run are React screens (ADR-0004 step 3). They look and work as before; relative times and restock countdowns refresh every minute and when you return to the app.
- Notes saved in another tab now show in an open panel straight away, not only after you leave the notes field. Typing in progress is still kept when another tab saves.
- Accessibility: the closed system panel can no longer be reached with the keyboard, focus returns to what opened it, and the editor's choice groups, the planet fields and the visit note have labels. Systems, Outlaw Run, the panel and the editor are now axe-gated in `pnpm check`.
### Fixed
- Sorting Systems by region put systems without a region first; they now come last, as intended.
- Opening another system while notes were still being typed could save those notes onto the wrong system.
### Internal
- The list filters, the outlaw run and the "Paste a list" parser are pure functions in `@atlas/core` with unit tests; Home and Outlaw Run share one outlaw calculation.
- `systems.js` and its 31 `window` functions are gone.

## [3.2.0] - 2026-10-27
### Changed
- Home is the first React screen (ADR-0004 step 3): it looks and works as before, and refreshes its relative times every minute and when you return to the app. The rest of the app is unchanged.
- The "I’m here" buttons on Home announce "I’m here: <system>" to screen readers, matching what's on screen.
### Added
- React tooling: component tests (Vitest + Testing Library), React lint rules, and a store subscription later screens reuse.
- Accessibility (axe) on Home now fails `pnpm check` on any violation (browser tests run locally, not in CI).
### Internal
- CI actions updated to their Node 24 releases.

## [3.1.0] - 2026-10-27
### Added
- ADR-0004: full-stack TypeScript (React + Vite, Zod, pnpm workspaces), with a stepwise migration plan. Steps 1 and 2 ship in this release.
- An offline browser test: after one online visit, Home, Systems, Calculators and the Codex (search and a previously read article) work with the network cut.
- `pnpm typecheck` (strict TypeScript) and Prettier; CI type-checks before every deploy.
- A report-only accessibility check (axe) on Home, Systems, Calculators and the Codex; its baseline is in `docs/STATE.md`.
### Changed
- The app is built with Vite (`apps/web`) and served from the build. Shared logic is strict TypeScript in `packages/core`, the wiki sync in `packages/wiki`; Node runs the sync's `.ts` files directly. pnpm replaces npm.
- Nothing loads from a CDN any more: Tailwind is compiled at build time, Phosphor icons, marked and DOMPurify are bundled, and Inter, Orbitron and JetBrains Mono are self-hosted (visitors' IP addresses are no longer sent to Google Fonts). Screens render as before.
- New service worker (Workbox) at the same `sw.js` address, so installed apps update in place: each deploy is one consistent precached version; the shared state file and the verification report stay network-first; wiki articles are cached as they are read. The old worker's caches are deleted.
- The state schema, game-data file, wiki API responses and article frontmatter are parsed with Zod; import errors read exactly as before. Outlaw settings saved as text ("5") are now stored as numbers.
- Unit tests run on Vitest; browser tests run against the built app.
### Fixed
- A Codex article could show raw Markdown if the CDN libraries failed to load; they are now bundled.
- A system field whose value was an inherited name such as `toString` (star class, race, conflict) was kept instead of cleared.

## [3.0.0] - 2026-10-27
### Added
- Development harness: lean `AGENTS.md`, `CLAUDE.md`, `docs/` (architecture, state schema, wiki mirror, deploy, calculators), ADRs 0001–0003, `docs/STATE.md`, and the prompt-graph protocol in `docs/process/`.
- Test tooling: ESLint, `node:test` unit tests, and a Playwright suite (41 checks on desktop and phone sizes) that pins current behaviour. `npm run check` runs all three locally; CI runs lint and unit tests on the synced wiki data before any commit-back or deploy.
- `scripts/serve.mjs`, a dependency-free local server (`npm start`).
- Unit tests for state merging and migration, the systems model and outlaw timer, the recipe planner, search, and the wiki parser (real page fixtures), plus guards that every inline handler is exposed and every module is precached offline.
- State schema guard: imports, the browser copy and the repo's `nms_state.json` are validated; invalid imports are rejected with the exact path and reason.
- An unreadable browser copy is preserved under `nms_master_os_state.corrupt-<time>` instead of being overwritten, with a banner explaining it.
- A persistent banner with Export when the browser refuses to save (storage full or private mode).
- Tabs stay in step: a save in one tab is picked up by the others, so a stale tab can't overwrite newer data.
- Timeouts on every fetch, and validation of the wiki API's responses before the sync writes anything.
### Changed
- **Breaking:** the app is now native ES modules (`assets/lib/` pure logic, `assets/app/` UI, `wiki/codex.js`). Opening `index.html` directly from disk (`file://`) no longer works; use `npm start`, the live site or the installed app.
- The wiki parser moved to `scripts/lib/wikitext.mjs`; mirror output is byte-identical.
### Fixed
- The Favourites filter on Systems (its button read a variable that is no longer global).
- Switching sections quickly no longer raises an uncaught "Transition was skipped" error.

## [2.6.0] - 2026-10-26
### Added
- Recipe planner: any craftable or cookable item, expanded to raw materials with totals, base values, alternative recipes and batch yields, from the wiki mirror.
- Base-value and mineral-extractor calculators on wiki values.
- Outlaw Run settings for your own packet price and nanite yield.
### Changed
- Calculators read `wiki/game-data.json` instead of hand-typed numbers. The Stasis Device totals now match the wiki (500 Radon/Sulphurine/Nitrogen per device) and the Anomalous Doughnut uses its real recipe.
### Removed
- Estimates with no game-data basis: doughnut scan payout, Units per salvaged ship, extractors-per-pipe rule.

## [2.5.0] - 2026-10-26
### Added
- Verified wiki mirror: 3,160 game-data pages rendered from wikitext at recorded revisions, structured recipes and fields, `npm run verify:wiki`, verification panel and per-article revision links in the Codex, "Used in" lists, redirect aliases.
- Weekly CI sync that commits changed wiki pages back to `main`.
### Changed
- Codex categories are now resources, products, cooking, fish, building, technology, places, missions, galaxies, updates. Article paths changed.
### Removed
- Mechanics prose pages and the hand-written starter articles from the Codex.

## [2.4.0] - 2026-10-26
### Added
- Home screen (current system, warp-back list, next outlaw run), Guides library, More page, bottom tab bar, edge-to-edge layout.
- Device integration: keep screen on, app-icon badge, haptics, share sheet, install prompt, persistent storage, swipe-to-close sheet, "Log a new system" shortcut.

## [2.3.0] - 2026-10-26
### Added
- Systems log: system details, tags, favourites, rating, notes, planets, visit journal, filters and sort, search integration.
- Outlaw Run rebuilt on systems tagged `outlaw`.
- The harvested wiki committed as a permanent archive.
### Changed
- The Logbook and outlaw stations migrate into `systems[]` automatically.

## [2.2.0] - 2026-10-26
### Added
- Installable PWA with offline support, deployed to GitHub Pages.

## [2.1.0] - 2026-10-26
### Added
- The Wiki Codex as its own page with faceted search, quick look and article view.

## [2.0.0] - 2026-10-26
### Added
- `nms_state.json` state protocol with Export/Import, the offline wiki Codex and harvester, and the UI overhaul.
