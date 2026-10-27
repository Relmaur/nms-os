# ADR-0004: Full-stack TypeScript, React + Vite, built and bundled

- **Status:** Accepted (2026-10-26). Supersedes ADR-0001 (steps 1–2 shipped in 3.1.0).
- **Release:** the migration ships in steps (below). A step is MAJOR only if it breaks a saved/exported state, a bookmarked URL or a supported way of running the app; the plan is that none does.

## Context
3.0.0 put the app on ES modules with lint, unit and browser tests, but the UI is still string templates with inline `onclick` handlers. Three of our safeguards exist only because of that: the inline-handlers test (a handler pointing at a non-exported function, which is how the Favourites bug shipped), the service-worker shell test (a hand-maintained offline file list), and `SAFE_ID` (ids interpolated into handler strings, the injection hole the 3.0.0 review found). The app is growing into session mode, timers, cross-device sync and a recommendations engine, and a hosted version may follow. The owner asked for full-stack TypeScript and current front- and back-end practice.

## Decision
- **Language:** TypeScript everywhere, ES modules, `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. Node scripts are `.ts` run directly by Node LTS (type stripping), no build.
- **Repo:** pnpm workspaces.
  - `packages/core`: pure domain logic (state, systems model, planner, search, schemas). No DOM, no Node APIs.
  - `packages/wiki`: wiki sync, parser, verification.
  - `apps/web`: the PWA.
  - `apps/api`: reserved for sync; not built until that track starts.
- **Front end:** React 19 single-page app built with Vite. TanStack Router with hash history, so `#systems`-style and `wiki/#/a/<path>` links keep working. Tailwind v4 at build time; Radix primitives (shadcn/ui pattern) for dialogs, menus, tabs.
- **Data at the boundaries:** Zod 4 schemas in `core` are the single source of truth; types are inferred from them. Every external input (imports, the browser copy, `nms_state.json`, wiki JSON, API payloads) is parsed, never cast.
- **App state:** a Zustand store wrapping the existing persistence rules (single write path, unread-copy protection, tab adoption). *Amended in 3.2.0:* while vanilla screens still mutate the same state object, React reads the existing store through `useSyncExternalStore` instead, since a second store would be a second source of truth. Revisit Zustand when the last vanilla screen is gone. Storage stays `localStorage` key `nms_master_os_state` on the same origin, so existing saves load unchanged (ADR-0002 still holds; no Data Privacy gate).
- **PWA:** vite-plugin-pwa (Workbox) generates the precache list from the build.
- **Codex:** wiki pages are rendered and sanitised at build time; the browser no longer needs `marked` and DOMPurify (with the Codex's React move; 3.1.0 bundles both).
- **Back end (recorded, not built):** Hono, Drizzle ORM on Postgres, request/response types shared from `core` schemas. Built only when cross-device sync starts, which opens the Data Privacy gate and its own ADR.
- **Quality tooling:**
  - Vitest for unit tests.
  - Testing Library for component tests.
  - Playwright (the existing suite) plus axe accessibility checks for browser tests.
  - typescript-eslint `strictTypeChecked` for linting, Prettier for formatting.
  - `tsc --noEmit` type check.
  - CI runs type check, lint and unit tests, then builds and deploys. Browser tests stay local (owner's decision).

## Migration (each step ships on its own; the Playwright suite stays green throughout)
Steps 1 and 2 shipped together in 3.1.0: the browser can't load `.ts` files, so the core couldn't become TypeScript before there was a build.
1. **Core to TypeScript:** `assets/lib/*` → `packages/core` with Zod schemas; unit tests → Vitest; wiki scripts → `packages/wiki` as `.ts`. No user-visible change. *(Done, 3.1.0.)*
2. **Vite shell:** Vite builds the current app unchanged; build-time Tailwind; vite-plugin-pwa. Pages deploys the build output. This step retires ADR-0001's "no build step". *(Done, 3.1.0: Tailwind v3's preflight, line heights and `space-y` are kept as shims so screens render as before; nothing loads from a CDN.)*
3. **React, screen by screen:** each section mounts as a React root until no inline handlers remain (Home, Systems, Outlaw, Calculators, Codex, Guides). *(In progress: Home in 3.2.0; Systems, the system panel and Outlaw Run in 3.3.0.)*
4. **Session mode + timers:** the first feature built natively in React.
5. **`apps/api`:** when sync is picked up.

## Trade-offs
- **Rejected: stay build-free JS (ADR-0001).** Cheapest to run, but the string-template UI keeps three bug classes alive that a component model removes, and every new screen adds inline handlers to guard.
- **Rejected: Next.js.** Server-first; an offline-first PWA either needs a server we don't have, or a static export that gives up most of what Next.js offers.
- **Rejected: SvelteKit.** Smaller phone bundles and a pleasant model, but a thinner ecosystem (component libraries, testing, accessibility primitives) and less reliable output from AI agents, which this project's process depends on.
- **Rejected: Biome instead of ESLint + Prettier.** Much faster, but lacks type-aware rules (`no-floating-promises`, unsafe `any`) that catch real bugs.
- **Rejected: IndexedDB now.** Changes where user data lives (Data Privacy gate) for no current need; state is ~20 KB. Revisit if the state outgrows `localStorage`.
- **Costs accepted:**
  - A build step: the served files are no longer the source files.
  - Runtime dependencies (React, Zod, Zustand, router) are bundled and pinned by the lockfile, not loaded from CDNs.
  - Moving the UI means rewriting it rather than relocating it, and the Playwright suite is what proves behaviour survived.

## Consequences
- `AGENTS.md` invariants changed with steps 1–2: "no build step", "libraries only from CDNs" and "add new files to `SHELL`" are gone.
- The precache is generated from the build; the Playwright `offline` project proves the app works without a network.
- `packages/core` must stay free of DOM and Node APIs so the web app, the wiki scripts and a future API all share it.
- Tests that guard string-template hazards (inline handlers, SW shell) are deleted when their hazard is gone, not before.
