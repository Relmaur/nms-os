# STATE — handoff log

Read this before starting work; update it before ending any non-trivial task. Keep it current, not historical: completed work moves to `CHANGELOG.md`.

_Last updated: 2026-10-27_

CI runs typecheck + lint + unit tests only (owner's decision: browser tests run locally via `pnpm check` before pushing).

## In progress
**ADR-0004 step 3, React screen by screen.** Done so far:
- Steps 1–2 shipped in 3.1.0.
- The React foundation and Home shipped in 3.2.0.
- Systems, the system panel and Outlaw Run shipped in 3.3.0.
- Calculators shipped in 3.4.0, with the recipe planner rebuilt as a build order ("Build it upward", owner's pick; brief in `apps/web/.impeccable/surfaces/`).

Next slice: the Codex (`apps/web/src/codex.js`, its own page).

## Blockers
None.

## Open decisions
- **Ythgall's 4th supercharged slot:** `nms_state.json` says R3C7, Book III says R3C8. Needs an in-game check.
- **Outlaw restock timer default (24 h)** is a guess; the in-game restock time is unknown.
- **SaaS / hosted version** (owner request 2026-10-27; on hold since 2026-10-26, stack first). Comes back with cross-device sync. It will trigger the Data Privacy gate (accounts, PII, GDPR/LFPDPPP) and needs an ADR. Also to check: Hello Games' fan-content terms, and CC BY-SA obligations for serving wiki content in a hosted product.

## Next steps
1. **ADR-0004 step 3: React, screen by screen.** Each section mounts as a React root; plan it as its own cycle.
   - Order: ~~Home~~ (3.2.0), ~~Systems + Outlaw~~ (3.3.0), ~~Calculators~~ (3.4.0), Codex, Guides/More. Follow the React screens section of `docs/architecture.md`.
   - The header search (`main.js`) keeps a string `starDot` until the header moves.
   - As screens move:
     - delete the Tailwind v3 shims (`apps/web/src/tailwind-v3-*.css`, the line-height overrides in `tailwind.css`);
     - delete the `Object.assign(window, …)` exports and `tests/unit/inline-handlers.test.mjs` once no inline handlers remain;
     - fix the axe findings and make `tests/e2e/a11y.spec.mjs` a gate (it reports only, today). Baseline at 3.1.0, phone size:
       - Home (3.2.0), Systems, Outlaw Run, the system panel and the editor (3.3.0): gated on their own content, with the populated fixture only; empty states aren't axe-checked yet.
       - The page shell: `page-has-heading-one` (no `h1`; found on Systems at 3.1.0). Fix with the header's move.
       - Codex: `aria-allowed-attr` (10, critical), `aria-dialog-name`, `aria-allowed-role`, `empty-heading`.
       - Calculators (3.4.0): gated, opening view and mid-plan.
2. **Session mode + timers**, built natively in React (ADR-0004 step 4).
3. **Cross-device sync** (Data Privacy gate, `apps/api`: Hono + Drizzle + Postgres), then the recommendations engine on `wiki/game-data.json`.

## Known residuals
- **Not parsed yet:** the Codex's `wiki/index.json` and `offline-bundle.js` are read without a schema. Parse them when the Codex moves to React (step 3).
- **Codex rendering:** it still renders Markdown in the browser (bundled `marked` 12 + DOMPurify). ADR-0004 moves this to build time with the Codex's React move.
- **Visual differences (1–5 px):** a few headings with both `leading-*` and a responsive `text-*` class are slightly taller. Tailwind v4 lets the explicit line height win; v3 let the responsive size override it.
- **macOS renames:** on case-insensitive disks, a case-only wiki title change keeps the old file name's casing. The next local sync re-plans the rename harmlessly; CI (Linux) renames normally.
- **Whole-suite browser failure:** twice (3.1.0 and 3.4.0 work) a Playwright run failed every test at once ("no uncaught or console errors", elements not found) and the same run passed in full right after. Suspected cause: another local server or a build racing the preview server; capture `test-results/` the next time it happens.
- **Flaky browser test:** `resilience.spec.mjs` › "two tabs with the same notes settle on the newest text" failed once under full parallel load on 2026-10-27 and passed 10/10 alone and in two further full runs. It leans on an 800 ms autosave and a fixed 1.5 s wait; give it an explicit condition to wait for if it recurs.
- **Phone e2e:** the phone project skips the header-search test (the phone opens search from a button).
- **Precache size:** about 12 MB, mostly the Codex's full-text bundle (7 MB) and `game-data.json` (2.3 MB), as before.
