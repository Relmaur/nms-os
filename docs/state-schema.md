# State schema & merge rules (`nms_state.json`)
The application state MUST be serializable to and from `nms_state.json` at the repository root.
- On load, `index.html` attempts to `fetch('./nms_state.json')` to hydrate initial state, merging with `localStorage.getItem('nms_master_os_state')`.
- Provide an **"Export nms_state.json"** button and **"Import nms_state.json"** file dropzone in the top header.

## Default `nms_state.json` Schema:
See [`nms_state.json`](./nms_state.json) at the repository root — it is the canonical default and the shape every export/import must follow:

- `meta` — `version`, `lastUpdated`, `platforms`, `currentPhase`
- `fleet` — `primaryStarship`, `salvageStarship`, `multiTools[]`
- `checklists` — flat map of `id -> boolean` (named milestones such as `crossSaveLinked`, plus guide checklist item ids such as `cs1`, `rm3`)
- `systems[]` — `{ id, name, galaxy, region, glyphs (12 hex or ''), star (yellow|red|green|blue|purple|''), race (gek|korvax|vykeen|none|abandoned|''), economy, wealth (0–3), conflict (low|medium|high|pirate|''), tags: string[], favorite, rating (0–5), notes, planets: [{ id, name, biome, tags, notes }], visits: [{ at: ISO, note?, packets? }], createdAt }`. Tags are lowercase slugs (`trade-hub`).
- `outlaw` — `{ restockHours, packetsPerVisit, runSize, unitsPerPacket, nanitesPerPacket }`. The last two are the player's own in-game averages (packet prices and contents aren't fixed game data). Outlaw stations are systems tagged `outlaw`; one counts as ready once `restockHours` have passed since its last visit with `packets`.
- Legacy keys `logbook[]` and `outlaw.stations[]` are migrated into `systems[]` by `migrateToSystems()` (assets/systems.js) on load and import; ids are kept so re-merging never duplicates.

## Merge rules
- Precedence: built-in defaults ← `nms_state.json` ← `localStorage`. If `nms_state.json`'s `meta.lastUpdated` is newer than the browser copy (e.g. after a `git pull` from another machine), the file wins instead.
- Objects merge key-by-key; arrays (`systems`, `multiTools`, slot lists) are replaced wholesale.
- Data from the pre-2.0 key `ATLAS_MASTER_OS_STATE_V2` (`checkedItems` / `logEntries`) is migrated automatically on load and on import.
