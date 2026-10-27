# STATE — handoff log

Read this before starting work; update it before ending any non-trivial task. Keep it current, not historical: completed work moves to `CHANGELOG.md`.

_Last updated: 2026-10-27_

CI runs typecheck + lint + unit tests only (owner's decision: browser tests run locally via `pnpm check` before pushing).

## In progress
Nothing in progress. **ADR-0004 step 3 (React, screen by screen) is done** as of 3.8.0:
- Steps 1–2 shipped in 3.1.0.
- The React foundation and Home shipped in 3.2.0.
- Systems, the system panel and Outlaw Run shipped in 3.3.0.
- Calculators shipped in 3.4.0, with the recipe planner rebuilt as a build order ("Build it upward", owner's pick; brief in `apps/web/.impeccable/surfaces/`).
- 3.8.0: the main page's frame (header and search, sidebar, tab bar, storage banner) is React; no inline handlers remain; the Tailwind v3 shims are gone.
- 3.7.1: "Keep screen on" turns on with one tap after the system dropped the lock (owner report).
- 3.7.0: Guides, the six books and More are React; checklist steps are real checkboxes.
- 3.6.0: the Codex is React, with each article's index up front on phones; every phone sheet closes by its grab bar (no ✕), and the system editor swipes too.
- 3.5.0: Calculators gets a tool dock with the planner first (owner's request), and ticks carry over when what was gathered still covers a smaller need. The DESIGN.md names ("The Ship's Console", colour names) stay as recorded (owner deferred to the recommendation).

Next: ADR-0004 step 4, Session mode and timers (below).

## Blockers
None.

## Open decisions
- **Ythgall's 4th supercharged slot:** `nms_state.json` says R3C7, Book III says R3C8. Needs an in-game check.
- **Outlaw restock timer default (24 h)** is a guess; the in-game restock time is unknown.
- **SaaS / hosted version** (owner request 2026-10-27; on hold since 2026-10-26, stack first). Comes back with cross-device sync. It will trigger the Data Privacy gate (accounts, PII, GDPR/LFPDPPP) and needs an ADR. Also to check: Hello Games' fan-content terms, and CC BY-SA obligations for serving wiki content in a hosted product.

## Next steps
1. **Session mode + timers**, built natively in React (ADR-0004 step 4). Plan it as its own cycle.
2. **Cross-device sync** (Data Privacy gate, `apps/api`: Hono + Drizzle + Postgres), then the recommendations engine on `wiki/game-data.json`.
3. **Axe on empty states:** every screen is gated with the populated fixture; empty states (no systems, no outlaw systems) aren't axe-checked yet.

## Known residuals
- **Book content is hand-written:** the six books (`src/ui/guides/books/`) were ported as written. Their game facts (slot counts, prices, recipes) predate the wiki mirror and aren't sourced from it (the invariant in AGENTS.md, ADR-0003). A later content pass could link claims to Codex articles or drop what the wiki contradicts; owner's call.
- **Codex rendering:** it still renders Markdown in the browser (bundled `marked` 12 + DOMPurify), now in React. ADR-0004's move to build time is left for its own slice: it reshapes the 3,160-article data pipeline.
- **Visual differences from Tailwind v4 (1–5 px):** small labels (10–11px text) take v4's proportional line heights rather than their parent's fixed one, a few headings with both `leading-*` and a responsive `text-*` class are slightly taller, and dropdowns are 2–4px narrower. Checked by a before/after screenshot diff of every screen at 3.8.0.
- **macOS renames:** on case-insensitive disks, a case-only wiki title change keeps the old file name's casing. The next local sync re-plans the rename harmlessly; CI (Linux) renames normally.
- **Whole-suite browser failure:** twice (3.1.0 and 3.4.0 work) a Playwright run failed every test at once ("no uncaught or console errors", elements not found) and the same run passed in full right after. Suspected cause: another local server or a build racing the preview server; capture `test-results/` the next time it happens.
- **Flaky browser test:** `resilience.spec.mjs` › "two tabs with the same notes settle on the newest text" failed once under full parallel load on 2026-10-27 and passed 10/10 alone and in two further full runs. It leans on an 800 ms autosave and a fixed 1.5 s wait; give it an explicit condition to wait for if it recurs.
- **Phone e2e:** the phone project skips the header-search test (the phone opens search from a button).
- **Precache size:** about 12 MB, mostly the Codex's full-text bundle (7 MB) and `game-data.json` (2.3 MB), as before.
