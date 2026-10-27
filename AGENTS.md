# AGENTS.md — ATLAS // MASTER OS

Local-first No Man's Sky companion (TypeScript, pnpm workspace, Vite): Systems log, Outlaw Run, calculators on a verified wiki mirror, the Codex, and a six-book guide. Installable PWA on GitHub Pages: https://relmaur.github.io/nms-os/

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
- **Stack (ADR-0004):** strict TypeScript in `packages/`; Vite builds `apps/web` (UI still vanilla JS until React lands). Every dependency is bundled and pinned by `pnpm-lock.yaml`; nothing loads from a CDN at run time.
- **`packages/core` stays pure:** no DOM, no Node APIs. The web app, the wiki scripts and a future API all import it.
- **Parse, don't cast:** data from outside the code (files, storage, network) goes through a Zod schema before use.
- **Relative paths everywhere**, since the site lives under `/nms-os/`.
- **User data stays on the device** (`localStorage` key `nms_master_os_state`). Nothing is sent anywhere except by an explicit Export (ADR-0002). Changing that is a Data Privacy gate.
- **State compatibility:** every saved or exported `nms_state.json` must keep loading. Shape changes are additive, with a migration in the state module, or a MAJOR release.
- **Game facts come only from the wiki mirror** (`wiki/game-data.json`), never hand-typed. Anything the wiki can't know is a labelled user input (ADR-0003).
- **Never hand-edit mirrored files** in `wiki/<category>/`: the sync overwrites them. Never delete them; the sync flags removals. Your own articles go in `wiki/custom/`.
- **Offline:** the service worker precaches the build automatically. A new runtime fetch (outside the build) needs a route in `apps/web/src/sw/sw.ts` and a check in the `offline` Playwright project.

## Commands
| Command | What it does |
|---|---|
| `pnpm install` | Install (Node ≥ 24; pnpm via corepack, version pinned in `package.json`) |
| `pnpm dev` | Vite dev server for the app (`pnpm start` is an alias) |
| `pnpm build` / `pnpm preview` | Build `apps/web/dist` / serve the build |
| `pnpm index:wiki` | Rebuild derived wiki files from the committed archive (run after a fresh clone) |
| `pnpm sync:wiki` | Sync the mirror from the live wiki, record verification, reindex |
| `pnpm verify:wiki` | Dry run: does the archive match the wiki? Exit 1 if not |
| `pnpm typecheck` | `tsc` for packages, scripts, tests, the web app and the service worker |
| `pnpm lint` / `pnpm format` | ESLint (typescript-eslint strict, type-checked) / Prettier |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | Build, then Playwright on desktop, phone and offline |
| `pnpm check` | typecheck + lint + unit + e2e: must pass locally before pushing code changes (CI runs all but e2e) |

## Coding standards
- Match the surrounding code: naming, comment density, Tailwind utility style, `escapeHtml` for every interpolated string in HTML templates.
- Comments explain *why* (domain rules, trade-offs, fallbacks), not what.
- YAGNI: the smallest reversible change; no new abstraction without a second use.
- Pure logic goes in `packages/core` with unit tests; DOM code stays in `apps/web`.
- New or moved screens are React: `apps/web/src/ui/<screen>/*.tsx`, logic in `@atlas/core`, state via `useAppState()` + actions, no inline handlers, a component test, and an axe gate (`docs/architecture.md`, React screens).
- TypeScript: no `any`; types for external data come from Zod schemas (`z.infer`); a cast needs a comment saying what proved it safe.
- External I/O gets a timeout and a visible fallback. Never fail silently on user data.
- Diagnostics: one structured `console.warn('[atlas]', { event, ... })` line, never user content.

## Policy gates (halt and ask)
- **Destructive:** deleting committed files (outside the wiki sync), dropping state keys, rewriting git history.
- **Major release:** breaking saved or exported state, bookmarked URLs, or a supported way of running the app.
- **Data privacy:** any change to where user data is stored or sent.

## Definition of done
`pnpm check` passes. `docs/STATE.md` is updated. `CHANGELOG.md` has an entry under `[Unreleased]` (SemVer). Any ADR needed is written. No gate is left open.
