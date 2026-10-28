# ADR-0008: A local, read-only MCP server instead of a built-in AI assistant

- **Status:** Accepted (2026-10-27), shipped in 3.17.0. The owner chose this over a paid in-app chatbot, chose pairing with the sync code, and cleared the Data Privacy gate with the roadmap (plan `mighty-plotting-quasar`). It adds a fourth exception to ADR-0002's "nothing leaves the device".

## Context
The owner wanted players to be able to ask an AI about the game and about their own log. A chatbot built into ATLAS would need a paid model, a server that sees the player's data, and retrieval over the Codex. Many players already pay for an AI client that speaks the Model Context Protocol (Claude Desktop, Claude Code and others). An MCP server lets that client call ATLAS's own deterministic tools: the answers are computed, not guessed, and they cite the wiki.

## Decision
- **Where it runs:** on the player's computer, started by their MCP client over stdio (`apps/mcp`, `pnpm mcp`; setup in `docs/mcp.md`). There is no hosted ATLAS service and no new relay endpoint.
- **SDK:** the official `@modelcontextprotocol/sdk`, pinned at 1.32.1 (three weeks old when chosen).
- **Game data:** the committed wiki mirror's derived files (`offline-bundle.js`, `game-data.json`, `facts.json`, `verification.json`), parsed with the app's schemas.
- **The player's log, read-only, from one of two places in the client's config:**
  - `ATLAS_SYNC_CODE`: the server derives the vault id, token and key from the code, `GET`s the sealed copy from the relay and opens it locally with `@atlas/core/sync-crypto`. The relay still sees only ciphertext. The same checks as the app apply: a copy sealed for another version than the relay labels it is refused, as are oversized or over-deep copies and invalid logs (`validateState`, then `buildState`). The copy is cached for a minute, so a burst of tool calls costs one request, which counts toward the relay's rate limits like a device's.
  - `ATLAS_STATE_FILE`: an exported `nms_state.json`, checked like an Import. Nothing is fetched.
- **It never writes:** the server sends no `PUT` or `DELETE` (a test holds it to `GET`), and none of its tools changes anything. All tools carry MCP's `readOnlyHint`. Changing the log stays the app's job.
- **Tools:** each wraps the `@atlas/core` function the matching screen uses, so the app and the AI never disagree.
  - Game: `search_codex`, `read_article`, `plan_recipe`, `item_value`, `cited_facts`. Each answer carries its Codex link, wiki URL and revision.
  - Player: `list_systems`, `get_system`, `outlaw_status`, `list_gear` (with the wiki's slot rules), `search_notes`, `read_note`, `list_timers`.
- **Without a log** the game tools still work, and the player tools say how to connect one. A malformed code is reported, not silently ignored.
- **Publishing:** repo only for now. Publishing it to npm is a separate, outward-facing step that needs the owner's yes.

## Published package (3.18.0)
- **Name:** `nms-atlas-mcp` on npm (`atlas-mcp` was taken). MIT, like the repo (root `LICENSE`, owner's choice); the wiki text it serves stays CC BY-NC-SA 3.0 (corrected in 3.20.0: earlier versions said CC BY-SA 3.0).
- **Bundled:** Node won't strip TypeScript types inside `node_modules`, so `vite build` (the web app's bundler) makes one `dist/main.js` with `@atlas/core` inlined, unminified so a player can read what runs. The SDK and Zod are its only dependencies. A test builds the bundle and drives it over stdio.
- **Game data from the live site:** a package can't carry the repo's mirror and stay current, so it downloads the four wiki indexes from `https://relmaur.github.io/nms-os/wiki/` on first run and keeps them in the system's cache folder (`wiki-remote.ts`).
  - It checks the site at most once a day, with conditional requests (an unchanged file costs a 304). The check runs in the background, so a new copy is used on the next run.
  - A download replaces the cache only if the whole set parses with the app's schemas, and each file goes through a temporary name, so a broken or interrupted download never replaces a good copy.
  - With no cache and no network the game tools say so; the player tools still work.
  - These requests carry nothing about the player. GitHub sees the computer's IP address, as with any visit to the site.
- **Run from a clone,** the server uses the repo's own `wiki/` as before; `ATLAS_WIKI_DIR` picks any folder.
- **Publishing** is done by the owner's npm account: `npm login`, then `pnpm publish` from `apps/mcp` (pnpm, so the workspace version specs are rewritten). The build runs first (`prepack`).
- **Started before its data is ready:** the server answers the client's handshake at once and loads the game data on the first tool call that needs it, so a first download on a slow line never trips the client's start-up timeout. A failed load is retried by the next call.
- **The cache stays consistent:** files and the note of their validators are both written through temporary names, and the note records each file's length. A file the note doesn't match is downloaded whole rather than revalidated, so two clients refreshing at once can't leave the cache trusting a file it wasn't written with. Downloads are capped by the bytes actually received.
- **The site's data format is now a public interface:** an installed package parses the live site's `game-data.json` and bundle with the schemas it shipped with. A future change those schemas can't read would leave a new installation of an old version without game data (an existing cache keeps working). Change those formats additively, or publish a new version first.

## Privacy (the gate's checklist)
- **New destination:** when the AI calls a player tool, the parts of the log that tool returns go to the player's AI client and, through it, to that client's model provider. The player turns this on by configuring the server; nothing in ATLAS sends it on its own.
- **The sync code in a config file:** it is as powerful as on a paired device (read and change the whole log, through the relay). `docs/mcp.md` says so, and offers `ATLAS_STATE_FILE` for players who'd rather not put the code in a file. More → Sync says, under the code, that an assistant can read the log through the MCP server.
- **What it sends:** to the relay, the same `GET` with a bearer token any device sends. Nothing else leaves the computer except tool answers to the client.
- **Diagnostics:** stderr only, never log contents. Stdout carries the protocol.

## Trade-offs
- **Rejected: a built-in chatbot.** It needs model costs (a paid tier), a server that sees players' logs, and retrieval that's less exact than the tools the app already has.
- **Rejected: a hosted MCP endpoint.** It would hold sync codes or decrypted logs on a server; the relay was built never to see either.
- **Rejected: write tools (log a visit, start a timer).** They'd make an AI's mistake a change to the player's log, and they'd need a merge-safe write path outside the app. Possible later, behind their own decision.
- **Accepted limits:**
  - The app refuses a format-1 copy once it has seen a format-2 one (a replayed old copy); that needs state the server doesn't keep between runs. Every copy written since 3.15 is format 2, so a relay replaying a pre-3.15 copy could still show the server an old log (read-only, and it's the player's own old data).
  - Answers are only as current as the copy: a device's unsynced changes, and the last minute of syncs, aren't seen.
  - The model's own words aren't ATLAS's: the instructions ask it to cite the links the tools return, but a client can still paraphrase wrongly.
