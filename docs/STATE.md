# STATE — handoff log

Read this before starting work; update it before ending any non-trivial task. Keep it current, not historical: completed work moves to `CHANGELOG.md`.

_Last updated: 2026-10-26_

CI runs lint + unit tests only (owner's decision: browser tests run locally via `npm run check` before pushing).

## In progress
**Stack migration (ADR-0004, accepted 2026-10-26):** full-stack TypeScript, pnpm workspaces, React 19 + Vite, Zod, Zustand, Vitest. Step 1 (core to TypeScript) is being planned. Until step 2 lands, ADR-0001 and the `AGENTS.md` invariants describe the running app.

Previously: **3.0.0 released** (2026-10-27): docs harness, lint + unit + browser tests, ES modules, hardening. Independent review: PASS after two fix rounds (id injection, notes autosave and tab sync, unread-copy protection, sync timeouts, case-only renames).

## Blockers
None.

## Open decisions
- **Ythgall's 4th supercharged slot:** `nms_state.json` says R3C7, Book III says R3C8. Needs an in-game check.
- **Outlaw restock timer default (24 h)** is a guess; the in-game restock time is unknown.
- **SaaS / hosted version (owner request, 2026-10-27; on hold since 2026-10-26, stack first):** a generous free tier or fully free with a "Buy the developer a coffee" button. A stack proposal is due after 3.0.0. It will trigger the Data Privacy gate (accounts, PII, GDPR/LFPDPPP) and needs an ADR. Also to check: Hello Games' fan-content terms, and CC BY-SA obligations for serving wiki content in a hosted product.

## Next steps (after 3.0.0)
1. ADR-0004 migration, step by step:
   1. Core to TypeScript.
   2. Vite shell.
   3. React screen by screen.
2. Session mode + timers, built natively in React (ADR-0004 step 4).
3. Cross-device sync (Data Privacy gate, `apps/api`), then the recommendations engine on `wiki/game-data.json`. The SaaS question comes back with sync.

## Files touched this cycle
Release 3.0.0: see `CHANGELOG.md` and `git log` from `63068e8`.

## Known residuals
- On case-insensitive disks (macOS) a case-only wiki title change keeps the old file name casing; the next local sync re-plans the rename harmlessly. CI (Linux) renames normally.
- The phone project skips the header-search e2e test (the phone opens search from a button).
