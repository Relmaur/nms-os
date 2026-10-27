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
