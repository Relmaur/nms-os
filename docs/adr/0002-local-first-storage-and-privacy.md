# ADR-0002: Local-first storage, privacy posture and consistency model

- **Status:** Accepted (2026-10-27), recording the design in place since 2.0.0 plus the 3.0.0 hardening. Amended by ADR-0005 (opt-in, end-to-end encrypted sync between a player's devices) and ADR-0006 (opt-in push alerts for timers).

## Context
Everything the player logs (systems, planets, visits, notes, checklists, ships and Multi-Tools, outlaw settings) is personal, small (well under 1 MB), and used on one device at a time, often offline mid-session. There is no server.

## Decision
- **Storage:** one JSON document in `localStorage` (`nms_master_os_state`), written whole on every change by `saveAppState()`. On load it is merged with the repo's `nms_state.json` (defaults ← file ← local; a newer file wins). Export/Import moves it between devices.
- **Privacy:** user data never leaves the device except through an explicit Export. No telemetry, no analytics, no error reporting service, no third-party calls carrying user text. Console diagnostics are structured and contain no state contents.
- **Consistency:**
  - Strong within a tab: a single writer applies whole-document saves.
  - Between tabs on one device, last write wins. From 3.0.0 a `storage` event listener reloads the other tab immediately, so a stale tab can't silently overwrite newer data.
  - Between devices: manual and explicit (Export/Import), or, once the person turns it on, encrypted sync with a three-way merge (ADR-0005).
- **Durability:**
  - A failed write (quota, private mode) shows a persistent banner that offers an export.
  - A corrupt stored copy is preserved under a `.corrupt-<timestamp>` key before recovery.
  - The installed app requests persistent storage.

## Trade-offs
- **Rejected: IndexedDB.** Async and higher capacity, but the document is small, the code would grow (async on every save path), and `localStorage`'s synchronous whole-document write is simpler to reason about for consistency.
- **Rejected for now: server-side storage or accounts.** It would give sync and backup, but brings authentication, PII handling under GDPR/LFPDPPP, retention policies and hosting costs. That belongs to the SaaS track, decided in its own ADR.

## Gate
Any change to where user state is stored or sent (a GitHub Gist sync, accounts, analytics, AI features that send notes) triggers the Data Privacy policy gate. It needs its own ADR covering data minimisation, consent, retention/TTL, and how secrets such as tokens are stored.
