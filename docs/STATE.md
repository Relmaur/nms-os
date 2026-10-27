# STATE — handoff log

Read this before starting work; update it before ending any non-trivial task. Keep it current, not historical: completed work moves to `CHANGELOG.md`.

_Last updated: 2026-10-27_

CI runs lint + unit tests only (owner's decision: browser tests run locally via `npm run check` before pushing).

## In progress
**Release 3.0.0: put the app on the prompt-graph harness** (plan: ADR-0001, ADR-0002).
- [x] Phase 0: calculators shipped (2.6.0).
- [x] Phase 1: docs harness (this file, ADRs, CHANGELOG, lean AGENTS.md).
- [x] Phase 2: ESLint + Playwright characterization tests (41 checks) + CI gate before commit-back/deploy.
- [x] Phase 3: ES-module refactor: `assets/lib/` (pure, 37 unit tests) + `assets/app/` (UI) + `wiki/codex.js`; `scripts/lib/wikitext.mjs` (derived wiki files byte-identical); handler and SW-shell guards.
- [x] Phase 4: hardening: state schema guard, save-failure banner, unreadable-copy preservation, multi-tab adoption, fetch timeouts, wiki API validation (44 unit + 53 browser checks).
- [ ] Phase 5: independent review, CHANGELOG 3.0.0, version bump, deploy, live checks.

## Blockers
None.

## Open decisions
- **Ythgall's 4th supercharged slot:** `nms_state.json` says R3C7, Book III says R3C8. Needs an in-game check.
- **Outlaw restock timer default (24 h)** is a guess; the in-game restock time is unknown.
- **SaaS / hosted version (owner request, 2026-10-27):** a generous free tier or fully free with a "Buy the developer a coffee" button. A stack proposal is due after 3.0.0. It will trigger the Data Privacy gate (accounts, PII, GDPR/LFPDPPP) and needs an ADR. Also to check: Hello Games' fan-content terms, and CC BY-SA obligations for serving wiki content in a hosted product.

## Next steps (after 3.0.0)
1. SaaS stack proposal + ADR (above).
2. Session mode + timers, through the full graph (first feature on the harness).
3. Cross-device sync (Data Privacy gate), then the recommendations engine on `wiki/game-data.json`.

## Files touched this cycle
`AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md`, `docs/**`, `package.json`, `eslint.config.js`, `playwright.config.js`, `scripts/serve.mjs`, `tests/**`, `.github/workflows/pages.yml`, `index.html` (transition fix), `assets/wiki-search.js` (lint).
