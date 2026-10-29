# STATE — handoff log

Read this before starting work; update it before ending any non-trivial task. Keep it current, not historical: completed work moves to `CHANGELOG.md`.

_Last updated: 2026-10-29_

CI runs typecheck + lint + unit tests only (owner's decision: browser tests run locally via `pnpm check` before pushing).

## In progress
**Task W, the full game-content Codex, from dumps only (owner, 2026-10-29; ADR-0009).** Fandom suggested waiting for a database dump over calling the API, so the mirror is fed only by dumps:
- Done (unreleased): `--from-dump`, `--verify --from-dump` and `--discover` in `pnpm sync:wiki` (`packages/wiki/src/dump.ts`, `discover.ts`); the API path removed; CI's schedule, sync step and commit-back job retired; `verification.json` tracked; "Wiki copy from <date>" in the Codex.
- Waiting on the owner: the dump file (they download it from Special:Statistics and say where it is).
- Then: run `--discover` on it; the report goes to the owner's private planning folder for approval (never the repo); widen `SCOPE` and add category allow-lists and exclusions with a renderer and fixture per new infobox; import; split the offline bundle (core built in, the rest an optional Full Codex download); report sizes.
- First dump sync: check what it reports as "removed upstream". The scope rule is now a top-level infobox in the page's own wikitext; the API also counted infoboxes pulled in through other templates.
- The local `wiki/verification.json` is still the last API sync's: commit the one the first dump sync writes, not this one.
- `packages/wiki/src/api-schema.ts` and its test were deleted with the owner's yes (unused once the API path went).

**The app is now ATLAS:OS, and the repo runs on build prompt v2.0** (`docs/process/build-prompt.md`; owner, 2026-10-28). The docs use the new name. The public rename waits for the owner's yes (Public surface gate): the repo, the URL, `nms-atlas-mcp`, the PWA manifest and the in-app title. The redesign runs in this order: tokens and `apps/web/DESIGN.md`, the shell (a four-tab bar plus a search key), shared components, then the core-loop screens.

**Redesign step 0 done (tokens and docs, 2026-10-28, unreleased):** `apps/web/src/tokens.css` holds every value of the new look as `@theme static` tokens (CSS variables and utilities); `DESIGN.md` and `PRODUCT.md` describe ATLAS:OS and the new design; Orbitron 800 is bundled. No screen uses the tokens yet, so nothing looks different. Choices made in this step:
- Tokens are written in CSS (`@theme`), not a DTCG JSON file with a generator: Tailwind already makes the variables and utilities from that one source. A DTCG export can be generated from it if the design system ever needs one.
- Values follow the round's screens where they differ from the older design-system notes: 12/14/18px radii for controls, primary buttons and cards, and a 10px label at 0.16em.
- The active tab's icon has no glow: the design decisions say the live-run dot is the only glow in the bar (the screen files draw one).
- Destructive actions are rose (`danger-rose-*`), as the screens draw them; crimson stays the outlaw mark.
- Star and biome data colours join the tokens with the StarMark and PlanetMarker components (step 2).

**Design round 3 (2026-10-28) is the current round:** rebuild 01, 02, 03, 04, 05, 06, 11, 13, 16, 27, 28; new 05b, 05c, 29–34. It confirms Log as Systems · Map · Fleet · Notes. Built in the build order: shell, components, then screens.

**Redesign step 1, the shell, first increment done (unreleased):**
- The tab bar is the floating pill with four tabs and the search key (`TabBar.tsx`, `theme.css`; the Codex page's static copy matches). `tabOf()` files every section under a tab: More → Home, Systems/Fleet/Notes → Log, Outlaw/Calculators → Runs, Guides/books → Codex.
- `LogSegment` tops Systems, Fleet and Notes. Map joins it when the Map screens are built (step 5).
- Settings: a gear in the header below lg, until Home's own header (01) carries it.
- The in-app name and the PWA manifest are ATLAS:OS (owner, 2026-10-28). The manifest `id` is unchanged, so installs update in place. The repo, the `/nms-os/` URL and `nms-atlas-mcp` wait for a rename plan.
- Interim, until their screens are rebuilt: the Runs tab opens Outlaw stations (28 Runs isn't built); its live dot means "a station is ready"; the phone header stays (it holds the session button, which Home's hold-to-start and 04 replace); sheets keep their old shadow and 300ms exit; the search overlay covers the bar, so the key's lit state waits for 19 Search.

**Live testing while building (owner's request, 2026-10-28):** `pnpm --filter @atlas/web exec vite --host --port 5173` serves the working tree on the home Wi-Fi; the owner opens `http://<the Mac's LAN address>:5173/` on the phone, and it reloads on every save. It's its own origin, so it starts with an empty log: bring data in with More → Import (one-way). Pairing sync there would write test edits back to the real log.

**Redesign step 2, shared components (unreleased):**
- Buttons (`ui/parts/Button.tsx`) and gesture buttons (`ui/parts/Gesture.tsx`) follow the c04 study's behaviour: slide completes past 85% and springs back in 220ms; hold fills over 600ms and rewinds in 150ms; arm gives a 3s window. Keyboard and assistive-tech clicks (`detail === 0`) act once, so a stray tap never fires a slide or a hold.
- The star chart: `@atlas/core/seed` (a synchronous sha-256 plus mulberry32, matching the design's reference) and `@atlas/core/orbit` (the side-view layout for XL, L and M) are tested against vectors taken by running the design's reference Python. `ui/parts/StarChart.tsx` draws StarMark, PlanetMarker and OrbitDiagram, with ±3° Kepler drift and corona breathing, both still under reduced motion.
- Star and biome data colours are tokens now (`star-*`, `biome-*`).
- The dev gallery shows every component in its states: `http://<the Mac's LAN address>:5173/dev/components.html`.

- **Biome families come from the wiki** (owner, 2026-10-28): the Biome page is mirrored by title; seven cited facts (`biome-*`) map Lush → lush, Scorched and Volcanic → hot, Frozen, Toxic, Irradiated → radioactive, Exotic. Barren, Dead, Marsh, Waterworld, Gas Giant, Infested and Paradise have no family and draw slate. Mega Exotic is left out: the page calls it "a class of their own".

**Redesign step 3, core-loop screens (unreleased):**
- **01 Home is rebuilt** (`ui/home/Home.tsx`, logic in `@atlas/core/home`: `heroStatus`, `heroPlace`, `warpBackLine`, `homeTimers`; `systemOrbit` in `@atlas/core/orbit`).
- `TimerRing` is in `ui/parts/`, for 04 to reuse.
- Below lg, Home hides the app header (`body[data-section]`, set by `showSection`) and draws its own. The session bar shows there only while a session is live.
- Home's own header has a timer button too, until Search's quick actions (19) can start a timer: without it a phone couldn't open the timers from Home.
- Browser tests start a session with `holdToStartSession()` (fixtures), since a tap no longer does.

- **02 Systems is rebuilt** (`ui/systems/Systems.tsx`; `filterChips` and `systemsLine` in `@atlas/core/systems-list`). Its phone header rules share Home's (`theme.css`).
  - Interim: Sort is a chip at the end of the rail (the design has no place for it); the Log segment still has three segments until Map.

**Next:** 03 System detail, 06 System editor (Location block), 04 Timers & Session.

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
- **Systems without a portal address** seed their orbit angles from the system's id instead of galaxy + address, so they don't all draw alike. The layout then changes once an address is logged. Recommendation: keep it.
- **Wide screens (1024px and up):** the screens are drawn at 390px only. Recommendation: ask the designer for a desktop frame; until then keep the four-tab pill centred at a max width, with content capped as today. Owner's call.
- **Delete `docs/process/prompt-graph.xml`?** `build-prompt.md` v2.0 supersedes it and nothing points at it any more. Deleting a committed file is a Destructive gate. Recommendation: delete it in the build prompt commit; the owner's kit keeps the old version.
- **Public rename to ATLAS:OS:** done in the app and the PWA manifest (owner, 2026-10-28). Still open: the repo, the Pages URL (a bookmarked-URL break, so a MAJOR release unless the old path redirects), and the npm package. Owner's call; a plan comes before any change.
- **Relay rate limits fail open:** if a `[[ratelimits]]` binding is missing, `apps/sync/src/index.ts` allows every request without a warning. Production has all three bindings. Recommendation: log one `[atlas]` warning when a binding is missing. Not fixed in the docs-only task.
- **MCP answers aren't redacted:** the player's notes and system names go to their AI client in full, by design (ADR-0008, `docs/mcp.md`). Recommendation: keep it, since the player chose the client. Revisit if ATLAS ever calls a model itself.
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
