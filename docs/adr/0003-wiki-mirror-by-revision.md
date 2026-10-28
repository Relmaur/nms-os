# ADR-0003: Mirror the wiki's game-data pages by revision id

- **Status:** Accepted (2026-10-26), shipped in 2.5.0

## Context
Deterministic tools (calculators, recommendations) need game data that is complete, current and verifiable. The No Man's Sky Wiki is the source; extracting the game's own files was ruled out by the owner. The first harvester converted rendered HTML for a handful of categories, mixed in hand-written articles, and could not say whether its copy matched the wiki.

## Decision
- **Scope:** main-namespace pages embedding a game-data infobox (Resource, Product, Technology, Technology NEXT, POI, Space Encounter, Mission, Milestone, Galaxy, Update), minus player-found multi-tools. No community prose, no hand-written content.
- **Provenance:** each article is rendered from the page's wikitext at a recorded `revId`. MediaWiki revisions are immutable, so `archived revId == live revId` proves a byte-identical source. `npm run verify:wiki` is a dry-run sync; the weekly CI run syncs, verifies and commits changed pages.
- **Structure:** infobox fields and recipe templates are stored as data in each file's frontmatter and compiled into `wiki/game-data.json`.
- **No silent loss:** obsolete pages are flagged; pages that leave the wiki are kept and marked removed. Renamed items resolve through the wiki's redirects (`wiki/aliases.json`).

## Trade-offs
- **Rejected: rendered-HTML scraping.** It needs one request per page (thousands), there's no structured data, and dynamic queries render whatever the wiki computed at fetch time, which is not reproducible.
- **Rejected: SQLite as the stored archive.** Good for queries, but it's a binary blob in git (no per-page diffs, so no reviewable record of wiki edits) and needs WebAssembly in the browser. A derived SQLite export remains possible.
- **Accepted limits:**
  - The mirror can claim to match the wiki, not the game. Each page's `{{Version}}` stamp is shown so the player sees how current the wiki says it is.
  - About 10 pages with malformed table markup render imperfectly.
  - 97 recipe ingredients have no in-scope page (mostly fish not yet on the wiki).

## Cited facts (3.16.0)
Some rules the tools need are stated only in prose: how many supercharged slots each class has, how large a technology grid can grow, where the Exosuit's supercharged slots are. They live on mechanics pages with no game-data infobox, so the infobox scope never reached them.

- **Scope:** a short, named list of mechanics pages (`MECHANICS` in `packages/wiki/src/wikitext.ts`: Inventory, Supercharged Slot, Starship, Multi-Tool, Exosuit, Exocraft, Freighter, Starship Outfitting Terminal) is mirrored by title with kind `mechanic`, in the Codex's Mechanics category. Same revision check, same converter. The list grows only when a tool needs a page.
- **A fact is data plus its sentence.** `packages/wiki/src/facts.ts` holds `{ page, quote, value }` for each fact; `@atlas/core/facts` (`FACT_VALUES`) gives each value's shape. The quote must appear word for word in the archived page (bold, links and line breaks aside).
- **Checked every run:** sync and verify check each quote against the live page; a quote that's gone makes the fact stale, is listed in `verification.json` (`staleFacts`), and fails `verify:wiki`. `pnpm index:wiki` writes only facts whose quote is in the archive to `wiki/facts.json`; the app applies nothing else.
- **Shown with its source:** the app states a rule only together with a link to the Codex page it comes from, and a mark that disagrees gets a warning, never a block. The wiki can be wrong; the player's own screen wins.
- **Rejected: typing the numbers into the app.** It's quicker, but it would be a hand-typed game fact with nothing to tell us when the wiki changes.
- **Rejected: parsing the numbers out of the prose automatically.** Sentences like "45 (10x4 + 5) for an A-class multi-tool" have no stable shape; a person reads the page once, and the quote check catches every later edit.
- **Accepted limit:** a fact stays correct only as long as its sentence does. When the wiki rewords a sentence without changing the rule, the fact still goes stale until someone updates the quote.
