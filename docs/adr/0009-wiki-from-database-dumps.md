# ADR-0009: The wiki mirror is refreshed from database dumps, never the API

- **Status:** Accepted (2026-10-29). The owner decided it after Fandom suggested waiting for a new database dump rather than calling the wiki's API. It changes how ADR-0003's mirror is fed, not what it is.

## Context
Since 2.x the mirror was refreshed through the MediaWiki API (`api.php`): CI ran `pnpm sync:wiki` on every push and every Monday, and committed changed pages back to `main`. The mirror is about to widen from ~3,170 game-data pages towards all of the wiki's game content, which would mean many more requests. Fandom publishes database dumps of the wiki (Special:Statistics) and suggested waiting for a new dump as the better way to get the content.

## Decision
- **One source: a dump.** `pnpm sync:wiki --from-dump <file>` reads a MediaWiki XML dump (`.xml`, or `.xml.gz`; a `.7z` is extracted first), streams it page by page, and applies the same scope, exclusions and rendering as before (`packages/wiki/src/dump.ts`). Redirects in the dump resolve renamed recipe ingredients, as the API's redirect lookup did.
- **No API calls to the wiki for content.** The API code is gone from the sync; run without `--from-dump`, it refuses and says how to get a dump. CI no longer syncs: no schedule, no sync step, no job that commits wiki pages back. CI only indexes the committed archive.
- **By hand, when a new dump is out:** the owner asks Fandom for a fresh dump after a major game update, or every month or two, and runs the sync. The changed pages and `wiki/verification.json` are committed like any other change (`verification.json` is now tracked).
- **The dump stays outside the repo.** It is the whole wiki, community pages included; only the in-scope pages' rendered text enters `wiki/`.
- **Verification compares the archive with the dump** (`pnpm verify:wiki --from-dump <file>`). Revisions are immutable, so a matching `revId` still proves an identical source, as of the dump. `verification.json` records `source: "dump"`, the dump's file name and `dumpDate` (its newest revision's timestamp).
- **Honest freshness:** the Codex says "Wiki copy from <date>" beside each article's source line and on its landing. "Fix this on the wiki" still links to the live page: corrections belong on the wiki and arrive with the next dump.
- **Scope discovery** (`--discover <dump> --out <report.md>`) reads the dump offline to propose which infoboxes and categories are game content, for the owner to approve before the scope widens.

## Consequences
- The Codex can lag the wiki by up to a dump cycle; each page still shows its revision and date, and now the dump's date.
- A page is in scope when its own wikitext uses a game-data infobox at the top level. The API's `embeddedin` also counted pages that pulled an infobox in through another template; the first dump sync reports any page that this drops (as "removed upstream"), to check by hand.
- CI is simpler and never touches the network for content, so a slow or changed wiki can't fail a deploy.
- Without a dump on hand, `verify:wiki` can't run; the committed `verification.json` describes the last dump sync.
