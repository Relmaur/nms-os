# How the prompt-graph harness applies here

`docs/process/prompt-graph.xml` is the development protocol for every non-trivial change. This page records which parts bind this project today, and what would change that. Re-read it whenever a change adds a server, accounts, third-party calls, or data leaving the device.

| Harness layer | Applies? | How it applies today | Re-evaluate when |
|---|---|---|---|
| Context engine (`AGENTS.md`, `docs/STATE.md`) | Yes | `AGENTS.md` holds invariants only; `docs/STATE.md` is updated before any non-trivial task ends. | Always applies. |
| Schema guard | Yes | Zod schemas in `@atlas/core` and `@atlas/wiki`: state files (import, `localStorage`, `nms_state.json`), `game-data.json` in the calculators, wiki API payloads and article frontmatter in the sync. Not yet: the Codex's `index.json` and offline bundle (see `docs/STATE.md`). | New external input or payload. |
| Failure mode & retry guard | Yes | Wiki API: retries with backoff, the committed archive ships if unreachable. Browser: timeouts on fetches, visible save-failure banner, multi-tab reload. | New I/O boundary. |
| Context pruning | Yes (process) | Long sessions compact into `docs/STATE.md` and commit messages. | — |
| PII scrubbing | Not today | No user data is sent anywhere: no server, no telemetry, no model calls. Notes and system names stay on the device. | Cross-device sync, accounts, analytics, error reporting, or any AI feature that sends user text. |
| Zero-retention & TTL | Not today | Nothing is stored by a third party. | Same as above (e.g. a Gist sync stores state on GitHub). |
| Abuse controls | Not today | Static site, no endpoints, no uploads. | Any hosted API or upload (see the SaaS track in `docs/STATE.md`). |

## Policy gates in this project
- **Destructive action:** deleting committed files outside the wiki mirror's own sync, dropping user-state keys, or rewriting git history needs explicit approval. The wiki sync may rewrite mirrored `.md` files; it never deletes them (removed pages are flagged).
- **Major release:** anything that breaks a saved `nms_state.json`, an exported file, a URL users bookmark (`#section`, `wiki/#/a/<path>`), or a supported way of running the app is a MAJOR bump and needs approval.
- **Data privacy:** any change to where user state is stored or sent (sync, accounts, analytics) halts for review and gets an ADR.
