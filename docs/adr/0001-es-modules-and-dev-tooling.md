# ADR-0001: Native ES modules, dev-only tooling, no build step

- **Status:** Accepted (2026-10-27). To be superseded by ADR-0004 at its migration step 2 (Vite build).
- **Release:** 3.0.0 (MAJOR: drops opening `index.html` from disk)

## Context
About 700 lines of app logic live in an inline `<script>` in `index.html`, and three classic scripts share the global scope with it. Nothing can be imported by a test runner, so state merging, migrations, the recipe planner and search have no automated tests. The app must stay build-free (any static host serves it as-is) and keep no runtime dependencies.

## Decision
- Pure logic moves to native ES modules in `assets/lib/` (no DOM access). Pages and Node tests import the same files.
- UI code moves to ES modules in `assets/app/` (and `wiki/codex.js`). Functions that inline `onclick` handlers call are assigned to `window` explicitly in one place per module, so markup doesn't change.
- Dev-only dependencies are allowed: ESLint (lint), Playwright (browser tests on desktop and phone sizes), `serve` (local server). They never ship to users.
- State validation is a small hand-written validator (`assets/lib/schema.js`).

## Trade-offs
- **Rejected: keep classic scripts and test them in a `node:vm` sandbox.** Keeps `file://` working, but tests depend on load order and shared globals, and every new file needs sandbox plumbing. The protection it buys (double-click to open) is already partial: the service worker, wiki fetches and installs don't work on `file://` anyway.
- **Rejected: a bundler (Vite/esbuild).** Proper modules plus tree-shaking, but adds a build step, a `dist/` artefact and a second source of truth for what's deployed. Native modules give the testability without it.
- **Rejected: Zod for schemas.** Excellent API, but loading it in the browser means a runtime CDN dependency (or a bundle) for one validator. The state shape is small and stable; a hand-written validator with path-precise errors is about 100 lines and is unit-tested.
- **Cost accepted:** `index.html` opened directly from disk no longer runs. `npm start`, the live site and the installed app are the supported ways in.

## Consequences
- `npm run check` (lint + unit + e2e) gates every deploy in CI.
- New logic goes in `assets/lib/` with tests. Anything touching the DOM stays in `assets/app/`.
- `sw.js` `SHELL` lists module files individually. A missing entry means that file isn't available offline until first visited.
