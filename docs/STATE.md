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
- 3.7.0: Guides, the six books and More are React; checklist steps are real checkboxes.
- 3.6.0: the Codex is React, with each article's index up front on phones; every phone sheet closes by its grab bar (no ✕), and the system editor swipes too.
- 3.5.0: Calculators gets a tool dock with the planner first (owner's request), and ticks carry over when what was gathered still covers a smaller need. The DESIGN.md names ("The Ship's Console", colour names) stay as recorded (owner deferred to the recommendation).

Next slice: the main page's header, sidebar and storage banner (header search, Export/Import, section nav); with them the Tailwind v3 shims, the `Object.assign(window, …)` exports and `tests/unit/inline-handlers.test.mjs` go.

## Blockers
None.

## Open decisions
- **Ythgall's 4th supercharged slot:** `nms_state.json` says R3C7, Book III says R3C8. Needs an in-game check.
- **Outlaw restock timer default (24 h)** is a guess; the in-game restock time is unknown.
- **SaaS / hosted version** (owner request 2026-10-27; on hold since 2026-10-26, stack first). Comes back with cross-device sync. It will trigger the Data Privacy gate (accounts, PII, GDPR/LFPDPPP) and needs an ADR. Also to check: Hello Games' fan-content terms, and CC BY-SA obligations for serving wiki content in a hosted product.

## Next steps
1. **ADR-0004 step 3: React, screen by screen.** Each section mounts as a React root; plan it as its own cycle.
   - Order: ~~Home~~ (3.2.0), ~~Systems + Outlaw~~ (3.3.0), ~~Calculators~~ (3.4.0), ~~Codex~~ (3.6.0), ~~Guides/More~~ (3.7.0), then the header, sidebar and storage banner. Follow the React screens section of `docs/architecture.md`.
   - The header search (`main.js`) keeps a string `starDot` until the header moves.
   - As screens move:
     - delete the Tailwind v3 shims (`apps/web/src/tailwind-v3-*.css`, the line-height overrides in `tailwind.css`);
     - delete the `Object.assign(window, …)` exports and `tests/unit/inline-handlers.test.mjs` once no inline handlers remain;
     - fix the axe findings and make `tests/e2e/a11y.spec.mjs` a gate (it reports only, today). Baseline at 3.1.0, phone size:
       - Home (3.2.0), Systems, Outlaw Run, the system panel and the editor (3.3.0): gated on their own content, with the populated fixture only; empty states aren't axe-checked yet.
       - The page shell: `page-has-heading-one` (no `h1`; found on Systems at 3.1.0). Fix with the header's move.
       - Codex (3.6.0): gated: landing, results, quick look, article, and the article index.
       - Guides, Book I, Book III and More (3.7.0): gated.
       - Calculators (3.4.0): gated, opening view, mid-plan, and the Registers tab (3.5.0).
2. **Session mode + timers**, built natively in React (ADR-0004 step 4).
3. **Cross-device sync** (Data Privacy gate, `apps/api`: Hono + Drizzle + Postgres), then the recommendations engine on `wiki/game-data.json`.

## Known residuals
- **Book content is hand-written:** the six books (`src/ui/guides/books/`) were ported as written. Their game facts (slot counts, prices, recipes) predate the wiki mirror and aren't sourced from it (the invariant in AGENTS.md, ADR-0003). A later content pass could link claims to Codex articles or drop what the wiki contradicts; owner's call.
- **Codex rendering:** it still renders Markdown in the browser (bundled `marked` 12 + DOMPurify), now in React. ADR-0004's move to build time is left for its own slice: it reshapes the 3,160-article data pipeline.
- **Visual differences (1–5 px):** a few headings with both `leading-*` and a responsive `text-*` class are slightly taller. Tailwind v4 lets the explicit line height win; v3 let the responsive size override it.
- **macOS renames:** on case-insensitive disks, a case-only wiki title change keeps the old file name's casing. The next local sync re-plans the rename harmlessly; CI (Linux) renames normally.
- **Whole-suite browser failure:** twice (3.1.0 and 3.4.0 work) a Playwright run failed every test at once ("no uncaught or console errors", elements not found) and the same run passed in full right after. Suspected cause: another local server or a build racing the preview server; capture `test-results/` the next time it happens.
- **Flaky browser test:** `resilience.spec.mjs` › "two tabs with the same notes settle on the newest text" failed once under full parallel load on 2026-10-27 and passed 10/10 alone and in two further full runs. It leans on an 800 ms autosave and a fixed 1.5 s wait; give it an explicit condition to wait for if it recurs.
- **Phone e2e:** the phone project skips the header-search test (the phone opens search from a button).
- **Precache size:** about 12 MB, mostly the Codex's full-text bundle (7 MB) and `game-data.json` (2.3 MB), as before.
