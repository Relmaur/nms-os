# AGENTS.md — ATLAS // MASTER OS

Local-first, build-free No Man's Sky companion: Systems log, Outlaw Run, calculators on a verified wiki mirror, the Codex, and a six-book guide. Installable PWA on GitHub Pages: https://relmaur.github.io/nms-os/

## Read first
- `docs/STATE.md`: current work, blockers, open decisions, next steps. Update it before ending any non-trivial task.
- `docs/process/prompt-graph.xml`: the development protocol (graph nodes, policy gates, done criteria). `docs/process/applicability.md` says which parts bind this project today.
- Load the scoped doc for the area you touch:
  - `docs/architecture.md`: layout, data flow, boundaries.
  - `docs/state-schema.md`: `nms_state.json` shape and merge rules.
  - `docs/wiki-mirror.md`: mirror scope, sync/verify, frontmatter.
  - `docs/calculators.md`: what calculators may compute.
  - `docs/deploy.md`: navigation, PWA, service worker, CI/CD.
  - `docs/adr/`: decisions and their trade-offs.

## Invariants
- **No build step, no runtime dependencies.** Pages are plain HTML + JS served as-is. Libraries come only from the CDNs listed in `sw.js` (`CDN_PRECACHE`). Dev-only npm packages are fine (ADR-0001).
- **Relative paths everywhere**, since the site lives under `/nms-os/`.
- **User data stays on the device** (`localStorage` key `nms_master_os_state`). Nothing is sent anywhere except by an explicit Export (ADR-0002). Changing that is a Data Privacy gate.
- **State compatibility:** every saved or exported `nms_state.json` must keep loading. Shape changes are additive, with a migration in the state module, or a MAJOR release.
- **Game facts come only from the wiki mirror** (`wiki/game-data.json`), never hand-typed. Anything the wiki can't know is a labelled user input (ADR-0003).
- **Never hand-edit mirrored files** in `wiki/<category>/`: the sync overwrites them. Never delete them; the sync flags removals. Your own articles go in `wiki/custom/`.
- **Offline:** any new file the app needs must be added to `SHELL` in `sw.js`.

## Commands
| Command | What it does |
|---|---|
| `npm start` | Serve the app locally (http://localhost:3000) |
| `npm run index:wiki` | Rebuild derived wiki files from the committed archive (run after a fresh clone) |
| `npm run sync:wiki` | Sync the mirror from the live wiki, record verification, reindex |
| `npm run verify:wiki` | Dry run: does the archive match the wiki? Exit 1 if not |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (`node --test tests/unit`) |
| `npm run test:e2e` | Playwright on desktop and phone sizes |
| `npm run check` | lint + unit + e2e: must pass locally before pushing code changes (CI runs lint + unit only) |

## Coding standards
- Match the surrounding code: naming, comment density, Tailwind utility style, `escapeHtml` for every interpolated string in HTML templates.
- Comments explain *why* (domain rules, trade-offs, fallbacks), not what.
- YAGNI: the smallest reversible change; no new abstraction without a second use.
- Pure logic goes in `assets/lib/` with unit tests; DOM code stays in `assets/app/`.
- External I/O gets a timeout and a visible fallback. Never fail silently on user data.
- Diagnostics: one structured `console.warn('[atlas]', { event, ... })` line, never user content.

## Policy gates (halt and ask)
- **Destructive:** deleting committed files (outside the wiki sync), dropping state keys, rewriting git history.
- **Major release:** breaking saved or exported state, bookmarked URLs, or a supported way of running the app.
- **Data privacy:** any change to where user data is stored or sent.

## Definition of done
`npm run check` passes. `docs/STATE.md` is updated. `CHANGELOG.md` has an entry under `[Unreleased]` (SemVer). Any ADR needed is written. No gate is left open.
