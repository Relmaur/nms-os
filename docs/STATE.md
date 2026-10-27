# STATE — handoff log

Read this before starting work; update it before ending any non-trivial task. Keep it current, not historical: completed work moves to `CHANGELOG.md`.

_Last updated: 2026-10-27_

CI runs lint + unit tests only (owner's decision: browser tests run locally via `npm run check` before pushing).

## In progress
Nothing in flight. **3.0.0 released** (2026-10-27): docs harness, lint + unit + browser tests, ES modules, hardening. Independent review: PASS after two fix rounds (id injection, notes autosave and tab sync, unread-copy protection, sync timeouts, case-only renames).

## Blockers
None.

## Open decisions
- **Ythgall's 4th supercharged slot:** `nms_state.json` says R3C7, Book III says R3C8. Needs an in-game check.
- **Outlaw restock timer default (24 h)** is a guess; the in-game restock time is unknown.
- **SaaS / hosted version (owner request, 2026-10-27):** a generous free tier or fully free with a "Buy the developer a coffee" button. A stack proposal is due after 3.0.0. It will trigger the Data Privacy gate (accounts, PII, GDPR/LFPDPPP) and needs an ADR. Also to check: Hello Games' fan-content terms, and CC BY-SA obligations for serving wiki content in a hosted product.

## Next steps (after 3.0.0)
1. SaaS stack proposal + ADR (above): next, at the owner's request.
2. Session mode + timers, through the full graph (first feature on the harness).
3. Cross-device sync (Data Privacy gate), then the recommendations engine on `wiki/game-data.json`.

## Files touched this cycle
Release 3.0.0: see `CHANGELOG.md` and `git log` from `63068e8`.

## Known residuals
- On case-insensitive disks (macOS) a case-only wiki title change keeps the old file name casing; the next local sync re-plans the rename harmlessly. CI (Linux) renames normally.
- The phone project skips the header-search e2e test (the phone opens search from a button).
