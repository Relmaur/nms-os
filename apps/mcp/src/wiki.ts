// The game data the tools answer from: the wiki mirror's derived indexes, the same files the Codex and the
// calculators read (docs/wiki-mirror.md), parsed with the same schemas. Nothing here is hand-typed (ADR-0003).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameDataSchema } from '@atlas/core/game-data';
import { makeCatalog, type Catalog } from '@atlas/core/planner';
import { prepare, type Entry, type PreparedEntry } from '@atlas/core/search';
import { parseBundle } from '@atlas/core/wiki-files';
import { FactsFileSchema, type FactsFile } from '@atlas/core/facts';

export const DEFAULT_WIKI_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../wiki');

export interface Wiki {
  articles: PreparedEntry[]; // every Codex article, bodies included
  byPath: Map<string, PreparedEntry>;
  byTitle: Map<string, PreparedEntry>; // lower-cased title → current article
  aliases: Record<string, string>; // old names the wiki redirects
  catalog: Catalog; // for the planner and values
  facts: FactsFile | null;
  checkedAt: string | null; // the last wiki verification, when there is one
}

export class WikiMissing extends Error {}

const read = (dir: string, file: string) =>
  fs.readFile(path.join(dir, file), 'utf8').catch(() => {
    throw new WikiMissing(`${file} is missing from ${dir}: run \`pnpm index:wiki\` in the ATLAS repo first.`);
  });

export async function loadWiki(dir = DEFAULT_WIKI_DIR): Promise<Wiki> {
  // offline-bundle.js is `window.WIKI_OFFLINE_BUNDLE = {…};`: a script for the browser, JSON inside.
  const script = await read(dir, 'offline-bundle.js');
  const parsed = parseBundle(JSON.parse(script.slice(script.indexOf('{'), script.lastIndexOf('}') + 1)));
  if (!parsed) throw new WikiMissing(`offline-bundle.js in ${dir} isn't a Codex bundle: rerun \`pnpm index:wiki\`.`);
  const data = GameDataSchema.parse(JSON.parse(await read(dir, 'game-data.json')));
  const facts = FactsFileSchema.safeParse(JSON.parse(await read(dir, 'facts.json').catch(() => 'null'))).data ?? null;
  const verification = await fs
    .readFile(path.join(dir, 'verification.json'), 'utf8')
    .then(text => JSON.parse(text) as unknown)
    .catch(() => null);
  const checkedAt =
    verification && typeof verification === 'object' && 'checkedAt' in verification
      ? String(verification.checkedAt)
      : null;

  // Parsed by WikiEntrySchema, so each is an Entry once optional fields left undefined are dropped.
  const articles = parsed.bundle.articles.map(entry =>
    prepare(Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined)) as Entry)
  );
  const byTitle = new Map<string, PreparedEntry>();
  for (const entry of articles) {
    const key = entry.title.toLowerCase();
    // A current page wins over an obsolete or removed one of the same name.
    const held = byTitle.get(key);
    if (!held || ((held.obsolete || held.removed) && !entry.obsolete && !entry.removed)) byTitle.set(key, entry);
  }
  return {
    articles,
    byPath: new Map(articles.flatMap(entry => (entry.path ? [[entry.path, entry]] : []))),
    byTitle,
    aliases: parsed.bundle.aliases,
    catalog: makeCatalog(data),
    facts,
    checkedAt
  };
}

// An article by its Codex path or its title (case-insensitive, or an old name the wiki redirects).
export function findArticle(wiki: Wiki, name: string): PreparedEntry | undefined {
  const trimmed = name.trim();
  const direct = wiki.byPath.get(trimmed) ?? wiki.byTitle.get(trimmed.toLowerCase());
  if (direct) return direct;
  const alias = Object.entries(wiki.aliases).find(([from]) => from.toLowerCase() === trimmed.toLowerCase());
  return alias ? wiki.byTitle.get(alias[1].toLowerCase()) : undefined;
}
