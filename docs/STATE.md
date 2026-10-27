# STATE — handoff log

Read this before starting work; update it before ending any non-trivial task. Keep it current, not historical: completed work moves to `CHANGELOG.md`.

_Last updated: 2026-10-27_

CI runs typecheck + lint + unit tests only (owner's decision: browser tests run locally via `pnpm check` before pushing).

## In progress
**ADR-0004 migration.** Steps 1–2 (core and wiki sync in TypeScript, Vite build, Workbox service worker, no CDNs) are done and released as 3.1.0. Next is step 3: React, screen by screen.

## Blockers
None.

## Open decisions
- **Ythgall's 4th supercharged slot:** `nms_state.json` says R3C7, Book III says R3C8. Needs an in-game check.
- **Outlaw restock timer default (24 h)** is a guess; the in-game restock time is unknown.
- **SaaS / hosted version** (owner request 2026-10-27; on hold since 2026-10-26, stack first). Comes back with cross-device sync. It will trigger the Data Privacy gate (accounts, PII, GDPR/LFPDPPP) and needs an ADR. Also to check: Hello Games' fan-content terms, and CC BY-SA obligations for serving wiki content in a hosted product.

## Next steps
1. **ADR-0004 step 3: React, screen by screen.** Each section mounts as a React root; plan it as its own cycle.
   - Suggested order: Home, Systems, Outlaw, Calculators, Codex, Guides.
   - As screens move:
     - delete the Tailwind v3 shims (`apps/web/src/tailwind-v3-*.css`, the line-height overrides in `tailwind.css`);
     - delete the `Object.assign(window, …)` exports and `tests/unit/inline-handlers.test.mjs` once no inline handlers remain;
     - fix the axe findings and make `tests/e2e/a11y.spec.mjs` a gate (it reports only, today). Baseline at 3.1.0, phone size:
       - Home: `label-content-name-mismatch` (2).
       - Systems: `page-has-heading-one`.
       - Codex: `aria-allowed-attr` (10, critical), `aria-dialog-name`, `aria-allowed-role`, `empty-heading`.
       - Calculators: clean.
2. **Session mode + timers**, built natively in React (ADR-0004 step 4).
3. **Cross-device sync** (Data Privacy gate, `apps/api`: Hono + Drizzle + Postgres), then the recommendations engine on `wiki/game-data.json`.

## Known residuals
- **Not parsed yet:** the Codex's `wiki/index.json` and `offline-bundle.js` are read without a schema. Parse them when the Codex moves to React (step 3).
- **Codex rendering:** it still renders Markdown in the browser (bundled `marked` 12 + DOMPurify). ADR-0004 moves this to build time with the Codex's React move.
- **Visual differences (1–5 px):** a few headings with both `leading-*` and a responsive `text-*` class are slightly taller. Tailwind v4 lets the explicit line height win; v3 let the responsive size override it.
- **macOS renames:** on case-insensitive disks, a case-only wiki title change keeps the old file name's casing. The next local sync re-plans the rename harmlessly; CI (Linux) renames normally.
- **Phone e2e:** the phone project skips the header-search test (the phone opens search from a button).
- **Precache size:** about 12 MB, mostly the Codex's full-text bundle (7 MB) and `game-data.json` (2.3 MB), as before.
