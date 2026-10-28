# STATE — handoff log

Read this before starting work; update it before ending any non-trivial task. Keep it current, not historical: completed work moves to `CHANGELOG.md`.

_Last updated: 2026-10-28_

CI runs typecheck + lint + unit tests only (owner's decision: browser tests run locally via `pnpm check` before pushing).

## In progress
**3.14.0, getting ready to share with the NMS community** (owner, 2026-10-27; ADR-0007). The owner is still the only user; nothing has been shared yet:
- The app holds nobody's save: the starter data and Books II, III and V are general.
- Players keep their own ships & Multi-Tools (`gear`) and Markdown notes (`notes`, pinnable to Home or a book).
- The owner's fleet migrates into `gear` on their devices. Their book findings are Markdown files kept outside the repo, to import once with Notes → Import .md.

**Roadmap approved 2026-10-27** (plan `mighty-plotting-quasar`):
- **3.15.0 shipped:** the security audit's client, web and CI fixes (ADR-0005/0006 sections). Branch protection on `main` (no force-push or deletion; owner approved). Audit report published as a private Artifact (https://claude.ai/artifact/B9w8mV5n6vrEJ8bchYpKxm), which the owner shares from its Share menu. Its open items: a shared github.io origin (a custom domain would fix it), framing, a "change sync code" action, and Dependabot PRs #1–#3 to review (#1 and #2 are major artifact-action bumps; merge them together).
- **3.16.0 shipped:** eight mechanics pages mirrored by title (Codex "Mechanics"), six cited facts in `wiki/facts.json` (quote checked on every sync and verify; ADR-0003 section), the slot picker following them, and an Exosuit kind (ADR-0007 section). It deviates from the plan in one way: the facts went in their own small `facts.json` instead of `game-data.json` (2.3 MB), so the gear editor doesn't load the whole dataset. Book III's rules 1 and 2 now follow the wiki. The converter fix re-rendered 135 articles.
- **3.17.0 shipped:** the local, read-only MCP server (`apps/mcp`, ADR-0008, `docs/mcp.md`): 12 tools on `@atlas/core`, reading the log with the sync code (GET only, opened locally) or an exported file. It's tested end to end with an in-memory client, over stdio, and against the relay Worker run locally. Not published to npm: that needs the owner's yes. **Owner check done (2026-10-27):** Claude Desktop on the Mac answered from the synced log through the server. Desktop apps need Node 24's full path as the command (`docs/mcp.md`): the system `node` on the owner's Mac is v18.

**After the roadmap (owner, 2026-10-27; plan `mighty-plotting-quasar`, second version):**
- Dependabot #1–#3 applied in one commit (CI green; the PRs closed themselves).
- **3.17.1:** the relay moved to `atlas-sync.nms-os.workers.dev`. The owner renames the workers.dev subdomain, then the commit is pushed straight away.
- **3.18.0:** Best crafts (Calculators, and the MCP `best_crafts` tool), the first recommendation. The MCP server is packaged for npm as `nms-atlas-mcp` (MIT, data downloaded from the live site and cached). Published to npm by the owner (passkey 2FA; `pnpm pack`, then `npm publish` of the tarball, so `workspace:*` is rewritten). Checked with `npx -y nms-atlas-mcp` from an empty folder.
- **3.18.1:** republished so the package's maintainer list carries the owner's new npm email. 3.18.0 and the `0.0.0-stage` placeholder keep the old one in their version records; only unpublishing them (within 72 h of 2026-10-28 03:02 UTC) would remove it, and the owner chose nothing destructive.
- The owner's five notes are in `~/Documents/ATLAS notes/`, for Notes → Import .md.

**Sync shipped in 3.10.0** (ADR-0005; the owner approved the design and its Data Privacy gate on 2026-10-27). The relay runs at `https://atlas-sync.nms-os.workers.dev` on the owner's Cloudflare account. It's deployed from a developer machine with `wrangler deploy` in `apps/sync` (`docs/deploy.md`).

More's Support row links to the owner's Ko-fi page (3.11.0).

**Push alerts for timers shipped in 3.12.0** (ADR-0006; owner chose an opt-in switch and cleared the Data Privacy gate on 2026-10-27). The relay's minute cron sends due pushes; the VAPID private key is a Worker secret.

ADR-0004 steps 3 and 4 are done: every screen is React (3.8.0), and Session mode with timers shipped in 3.9.0.

History of step 3:
- Steps 1–2 shipped in 3.1.0.
- The React foundation and Home shipped in 3.2.0.
- Systems, the system panel and Outlaw Run shipped in 3.3.0.
- Calculators shipped in 3.4.0, with the recipe planner rebuilt as a build order ("Build it upward", owner's pick; brief in `apps/web/.impeccable/surfaces/`).
- 3.9.0: Session mode (owner's picks: a session bar; refiner, crop, custom and outlaw timers; in-app plus system alerts; saved in the log).
- 3.8.0: the main page's frame (header and search, sidebar, tab bar, storage banner) is React; no inline handlers remain; the Tailwind v3 shims are gone.
- 3.7.1: "Keep screen on" turns on with one tap after the system dropped the lock (owner report).
- 3.7.0: Guides, the six books and More are React; checklist steps are real checkboxes.
- 3.6.0: the Codex is React, with each article's index up front on phones; every phone sheet closes by its grab bar (no ✕), and the system editor swipes too.
- 3.5.0: Calculators gets a tool dock with the planner first (owner's request), and ticks carry over when what was gathered still covers a smaller need. The DESIGN.md names ("The Ship's Console", colour names) stay as recorded (owner deferred to the recommendation).

Next: the recommendations engine on `wiki/game-data.json`.

## Blockers
None.

## Open decisions
- **Refining time unit:** the wiki's refining `seconds` is read as per unit made (as the Codex shows it, and the data fits: higher-yield recipes have lower times), so 300 Chromatic Metal by Stellar Fusion (30 per batch, 4.8 s) times 24 minutes. Worth timing one multi-output run in-game to confirm.
- **Outlaw restock timer default (24 h)** is a guess; the in-game restock time is unknown.
- **SaaS / hosted version:** set aside in favour of a free app with Ko-fi donations (owner, 2026-10-27). Sync went the account-free, encrypted way (ADR-0005). Hello Games publishes no fan-content policy that we found: keep the app clearly unofficial and never sell game content. The wiki text is **CC BY-NC-SA 3.0** (NonCommercial; the wiki's `Project:Copyrights` page, checked 2026-10-28; labelled CC BY-SA 3.0 by mistake until 3.20.0). A free, ad-free app with attribution fits it.

## Next steps
0. **`nms-atlas-mcp` 3.20.0 published** (owner, 2026-10-28): the npm package carries the corrected wiki licence.
0. **3.19.0 is live (2026-10-28):** migration `0004` applied and the relay deployed by the owner; `/v1/status` reports active vaults and push devices (1 and 2, the owner's own). The milestone (50 active vaults) is set in `.github/workflows/relay-usage.yml`.
1. **Owner check done (2026-10-27):** an iPhone and the PC synced on the live site (a system renamed on the phone showed on the PC).
2. **Owner check:** with the app installed on the iPhone, turn on "Alerts when the app is asleep", start a 2-minute timer, lock the phone, and confirm one notification with the timer's name arrives.
3. The recommendations engine on `wiki/game-data.json`.
4. **Owner check (3.14.0):** on the PC, open Ships & Multi-Tools (your fleet should be there), then Notes → Import .md with the five files from this session, pin them to Books II, III and V, and confirm they reach the iPhone.
5. **Freighter and Exocraft kinds:** the cited facts already cover their supercharged counts (Freighter: per class; Exocraft: three, fixed), but the wiki gives no fixed positions for the Exocraft. Add them if the owner wants to log them.
6. **Axe on empty states:** every screen is gated with the populated fixture; empty states (no systems, no outlaw systems) aren't axe-checked yet.

## Known residuals
- **Sync limits (ADR-0005):** there's no recovery without the code. A field changed on two devices goes to the copy saved last, not the one edited last. The legacy `fleet` object has no ids, so it's taken whole from the newer copy (gear and notes merge by id).
- **Players from before 3.14.0** still have the owner's old starter fleet (now migrated to gear) and the "Dissonant System #1" system in their log. They can delete them; no cleanup runs, since they can't be told apart from the owner's own (ADR-0007). The relay refuses copies over 256 KB (after gzip and encryption); today's log is about 1 KB.
- **Sync on iPhone:** an installed iPhone app doesn't share storage with Safari, so a scanned QR opens the wrong one. The code field covers it, and the UI says so.
- **Timer alerts while asleep need the switch:** without "Alerts when the app is asleep", a finished timer alerts only while the browser runs the app. With it on, pushes arrive within about a minute; on iPhone and iPad only for the Home Screen app (iOS 16.4+).
- **Crop harvest times are player input:** the wiki states them only in article prose ("approximately 60 minutes"), not as data; a later wiki-sync parser could extract them.
- **Book content is hand-written:** the six books (`src/ui/guides/books/`) were ported as written. Their game facts (slot counts, prices, recipes) predate the wiki mirror and aren't sourced from it (the invariant in AGENTS.md, ADR-0003). A later content pass could link claims to Codex articles or drop what the wiki contradicts; owner's call.
- **Codex rendering:** it still renders Markdown in the browser (bundled `marked` 12 + DOMPurify), now in React. ADR-0004's move to build time is left for its own slice: it reshapes the 3,160-article data pipeline.
- **Visual differences from Tailwind v4 (1–5 px):** small labels (10–11px text) take v4's proportional line heights rather than their parent's fixed one, a few headings with both `leading-*` and a responsive `text-*` class are slightly taller, and dropdowns are 2–4px narrower. Checked by a before/after screenshot diff of every screen at 3.8.0.
- **macOS renames:** on case-insensitive disks, a case-only wiki title change keeps the old file name's casing. The next local sync re-plans the rename harmlessly; CI (Linux) renames normally.
- **Whole-suite browser failure:** twice (3.1.0 and 3.4.0 work) a Playwright run failed every test at once ("no uncaught or console errors", elements not found) and the same run passed in full right after. Suspected cause: another local server or a build racing the preview server; capture `test-results/` the next time it happens.
- **Flaky browser test:** `resilience.spec.mjs` › "two tabs with the same notes settle on the newest text" failed once under full parallel load on 2026-10-27 and passed 10/10 alone and in two further full runs. It leans on an 800 ms autosave and a fixed 1.5 s wait; give it an explicit condition to wait for if it recurs.
- **Phone e2e:** the phone project skips the header-search test (the phone opens search from a button).
- **Precache size:** about 12 MB, mostly the Codex's full-text bundle (7 MB) and `game-data.json` (2.3 MB), as before.
