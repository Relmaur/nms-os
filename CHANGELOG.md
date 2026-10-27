# Changelog

All notable changes to ATLAS // MASTER OS. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/). For this app, a MAJOR bump means a saved or exported `nms_state.json`, a bookmarked URL, or a supported way of running the app stops working.

Versions up to 2.6.0 were reconstructed from git history when the changelog was introduced.

## [Unreleased]

## [3.2.0] - 2026-10-27
### Changed
- Home is the first React screen (ADR-0004 step 3): it looks and works as before, and refreshes its relative times every minute and when you return to the app. The rest of the app is unchanged.
- The "I’m here" buttons on Home announce "I’m here: <system>" to screen readers, matching what's on screen.
### Added
- React tooling: component tests (Vitest + Testing Library), React lint rules, and a store subscription later screens reuse.
- Accessibility (axe) now fails the build on any violation on Home.
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
