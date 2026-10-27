# ADR-0007: Player content — ships & Multi-Tools, and notes

- **Status:** Accepted (owner, 2026-10-27)
- **Date:** 2026-10-27

## Context
Before sharing ATLAS with the NMS community, the app still carried its owner's own playthrough:
- the starter data (`apps/web/public/nms_state.json`, `DEFAULT_STATE`) held the owner's fleet, milestone ticks, current phase and a logged system, so every new player started with them;
- Books II, III and V were partly written around the owner's ships (named ships, their slot coordinates and layouts).

That content is worth keeping, for the owner. Every player has findings like it. It belongs in each player's own log, not in the app.

## Decision
- **Two record types in the log**, both lists of records with ids:
  - `gear[]`: ships and Multi-Tools, structured (kind, name, class, type, role, supercharged slots as `R<row>C<col>`, Markdown notes). Home's fleet card reads it. Its own screen is "Ships & Multi-Tools" (`#gear`).
  - `notes[]`: Markdown notes, each pinnable to Home and to any Guide book (`pins`). Pinned notes show under the book, marked as the player's own, and never in the header search's "In the manual" results. Its own screen is "Notes" (`#notes`), with search and a Markdown file import.
- **Pins, not per-book fields:** one note can sit in several places, places can be added later without a migration, and `pins` merges as a set in sync.
- **Records with ids** merge record by record in sync (ADR-0005). The old `fleet` object had no ids and was taken whole from the newer copy.
- **Migration:** a log without `gear` gets its `fleet` converted once, with fixed ids and a fixed `createdAt`, so two devices that migrate separately agree byte for byte and sync sees one record per ship. `fleet` itself is kept and carried along (no state key is dropped). An emptied `gear` list stays empty.
- **General starter data:** `nms_state.json` equals `DEFAULT_STATE`, with no ships, notes, systems, ticks or phase. A test guards it. The repo file no longer outranks a device's own log: it holds nobody's save, so it is only a new device's starting point.
- **General books:** the owner-specific parts became general guidance with examples ("three supercharged slots in a row"). The owner's own versions are notes in the owner's log. They were imported from Markdown files kept outside the repo.
- **Sanitising synced Markdown:** notes arrive from every paired device, so they render through a strict DOMPurify allowlist (`apps/web/src/ui/parts/safe-html.ts`):
  - text formatting, lists, tables and links only;
  - links are http(s) or relative;
  - no images (they fetch from anywhere, so a note could beacon);
  - no `style`, `id` or `name`.

  The Codex shares the same renderer. `[[Name]]` in a note links to the Codex search, because the main page doesn't load the Codex index.

## Consequences
- Privacy is unchanged: gear and notes live where the rest of the log does (the device, Export, and the opt-in encrypted sync). There is no new destination, so no Data Privacy gate.
- State compatibility holds: both keys are additive and optional, and older logs migrate on load. Older builds carry the new keys along untouched.
- **Players who opened the app before 3.14.0** have the owner's starter fleet and logged system in their log, because defaults were saved with it. They show up as ordinary records the player can delete. This wasn't cleaned up automatically: it can't be told apart from the owner's own copy, and the app hadn't been shared yet.
- Notes can be up to 100,000 characters each. A large notes collection counts toward the relay's 256 KB sealed-copy cap (ADR-0005). It is compressed first, so that's roughly hundreds of pages of text.
- **Sync across the upgrade:** a sync base saved by an older build has no `gear`. `mergeStates()` gives it the same fleet migration before merging, so a ship deleted on one device isn't brought back by the other.
- **Remaining edge cases:**
  - A device still on a pre-3.14 build, with a log restored from an older export, could merge away an emptied `gear` list. The next load would then migrate `fleet` again. Every device moves to the new build on its next visit, so this was left alone.
  - Hand-made files with id-less entries get position-based ids.
- **Editors:** an editor whose record is deleted on another device while it's open says so on Save. A second Save keeps the record on purpose.
