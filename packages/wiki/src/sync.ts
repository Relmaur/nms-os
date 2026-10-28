// Mirrors the game-data pages of the No Man's Sky wiki into wiki/<category>/<slug>.md and rebuilds the Codex indexes.
//
//   pnpm sync:wiki     sync every in-scope page from the live wiki, record the verification, reindex
//   pnpm verify:wiki   dry run: report how the archive differs from the live wiki (exit 1 if it does)
//   pnpm index:wiki    reindex the committed archive only (no network)
//
// Scope: main-namespace pages that use one of the game-data infoboxes in SCOPE, plus the game-mechanics pages named in
// MECHANICS (for the rules facts.ts cites). Player discoveries (planets, creatures, bases, player-found ships and
// multi-tools) and community pages are out of scope.
// Every article is rendered from the page's wikitext at a recorded revision id. MediaWiki revisions are immutable,
// so an archived revId equal to the live revId means the copy matches the wiki's source exactly.
//
// Node 24+ runs this file as-is (type stripping); its only dependency is Zod, for the response schemas.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  WIKI_BASE,
  LICENSE,
  SCOPE,
  MECHANICS,
  FOLDERS,
  slugify,
  toFrontmatter,
  parseFrontmatter,
  summarize,
  buildArticle,
  ArticleMetaSchema,
  type ArticleMeta,
  type Page
} from './wikitext.ts';
import { InvalidResponse, readEmbeddedIn, readRevisions, readTitles } from './api-schema.ts';
import { FACTS, checkFacts, type FactPage } from './facts.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const WIKI_DIR = path.join(ROOT, 'wiki');
const WIKI_API = `${WIKI_BASE}/api.php`;
// Says who's asking and how to reach them, as MediaWiki's API etiquette asks.
const USER_AGENT =
  "ATLAS-wiki-sync/1.0 (fan-made No Man's Sky companion; +https://relmaur.github.io/nms-os/; contact: https://github.com/Relmaur/nms-os/issues)";
const BATCH = 50; // pages per revisions request (the API maximum for content)
const REQUEST_DELAY_MS = 250;
const REQUEST_TIMEOUT_MS = 30000; // a stalled connection must reach the retry/unreachable path, not hang the CI job
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const describe = (err: unknown) => (err instanceof Error ? err.message : String(err));

type Params = Record<string, string | number>;
interface ScopePage {
  pageId: number;
  title: string;
  kind: string;
}
interface ArchiveEntry {
  file: string;
  text: string;
  meta: ArticleMeta;
}
interface FileWrite {
  file: string;
  text: string;
}

const ApiFailure = z.looseObject({ error: z.looseObject({ code: z.string(), info: z.string() }) });
const Continuation = z.looseObject({ continue: z.record(z.string(), z.union([z.string(), z.number()])).optional() });
const Redirects = z.looseObject({
  query: z.looseObject({
    normalized: z.array(z.looseObject({ from: z.string(), to: z.string() })).optional(),
    redirects: z.array(z.looseObject({ from: z.string(), to: z.string() })).optional()
  })
});
const Aliases = z.record(z.string(), z.string());
const CustomMeta = z.looseObject({
  title: z.coerce.string().optional().catch(undefined),
  summary: z.coerce.string().optional().catch(undefined),
  data: ArticleMetaSchema.shape.data.catch(undefined)
});

// ---------------------------------------------------------------------------
// MediaWiki API
// ---------------------------------------------------------------------------
async function api(params: Params, attempt = 1): Promise<unknown> {
  const url = new URL(WIKI_API);
  const query: Params = { format: 'json', formatversion: '2', ...params };
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.href}`);
    const data: unknown = await res.json();
    const failure = ApiFailure.safeParse(data);
    if (failure.success) throw new Error(`${failure.data.error.code}: ${failure.data.error.info}`);
    return data;
  } catch (err) {
    if (attempt >= 4) throw err;
    await sleep(1000 * 2 ** attempt);
    return api(params, attempt + 1);
  }
}

// pageId -> { pageId, title, kind } for every page embedding an in-scope infobox.
async function fetchScope(): Promise<Map<number, ScopePage>> {
  const pages = new Map<number, ScopePage>();
  for (const [template, kind] of Object.entries(SCOPE)) {
    let cont: Params | null = {};
    while (cont) {
      const data = await api({
        action: 'query',
        list: 'embeddedin',
        eititle: `Template:${template}`,
        einamespace: 0,
        eilimit: 500,
        ...cont
      });
      for (const page of readEmbeddedIn(data, template)) {
        if (!pages.has(page.pageid)) pages.set(page.pageid, { pageId: page.pageid, title: page.title, kind });
      }
      cont = Continuation.parse(data).continue ?? null;
      await sleep(REQUEST_DELAY_MS);
    }
  }
  const { pages: mechanics, missing } = readTitles(await api({ action: 'query', titles: MECHANICS.join('|') }));
  for (const page of mechanics) {
    if (!pages.has(page.pageid)) pages.set(page.pageid, { pageId: page.pageid, title: page.title, kind: 'mechanic' });
  }
  // A renamed or deleted mechanics page: its archived copy is marked removed, and the facts citing it go stale.
  if (missing.length) console.warn(`⚠️  Mechanics pages not on the wiki: ${missing.join(', ')}`);
  return pages;
}

async function fetchRevisions(scope: Map<number, ScopePage>): Promise<Page[]> {
  const ids = [...scope.keys()].sort((a, b) => a - b);
  const pages: Page[] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const data = await api({
      action: 'query',
      prop: 'revisions',
      rvprop: 'ids|timestamp|content',
      rvslots: 'main',
      pageids: ids.slice(i, i + BATCH).join('|')
    });
    for (const page of readRevisions(data)) {
      pages.push({
        pageId: page.pageid,
        kind: scope.get(page.pageid)?.kind ?? '',
        title: page.title,
        revId: page.revid,
        revTimestamp: page.timestamp,
        content: page.content
      });
    }
    if (process.stdout.isTTY)
      process.stdout.write(`\r📥 Fetched ${Math.min(i + BATCH, ids.length)}/${ids.length} pages`);
    await sleep(REQUEST_DELAY_MS);
  }
  console.log(`${process.stdout.isTTY ? '\n' : ''}📥 Fetched ${pages.length} pages.`);
  return pages;
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------
// Frontmatter is validated, but the original object is kept: Zod rebuilds objects in schema key order, and the
// derived JSON must keep the archive's order byte-for-byte.
function readMeta(file: string, meta: Record<string, unknown>): ArticleMeta {
  const parsed = ArticleMetaSchema.safeParse(meta);
  if (!parsed.success) throw new Error(`wiki/${file}: invalid frontmatter (${parsed.error.issues[0]?.path.join('.') ?? '?'})`);
  return meta;
}

async function readArchive(): Promise<Map<number, ArchiveEntry>> {
  const byPageId = new Map<number, ArchiveEntry>();
  for (const folder of FOLDERS) {
    const dir = path.join(WIKI_DIR, folder);
    for (const file of (await fs.readdir(dir).catch(() => [])).filter(name => name.endsWith('.md'))) {
      const text = await fs.readFile(path.join(dir, file), 'utf8');
      const meta = readMeta(`${folder}/${file}`, parseFrontmatter(text).meta);
      if (meta.pageId) byPageId.set(meta.pageId, { file: `${folder}/${file}`, text, meta });
    }
  }
  return byPageId;
}

// Compares the live wiki with the archive and returns what a sync would change.
function plan(livePages: Page[], archive: Map<number, ArchiveEntry>) {
  const writes: FileWrite[] = [];
  const deletes: string[] = [];
  const excluded: { title: string; reason: string }[] = [];
  const outdated: { title: string; archived: number | undefined; live: number }[] = [];
  const missing: string[] = [];
  const taken = new Set<string>();
  const kept = new Set<number>();
  const titles = new Set<string>();
  const recipeNames = new Set<string>();
  const factTitles = new Set(Object.values(FACTS).map(fact => fact.page));
  const factPages = new Map<string, FactPage>();
  for (const page of [...livePages].sort((a, b) => a.pageId - b.pageId)) {
    const article = buildArticle(page);
    if (article.excluded !== undefined) {
      excluded.push({ title: page.title, reason: article.excluded });
      continue;
    }
    kept.add(page.pageId);
    titles.add(page.title.toLowerCase());
    for (const recipe of article.meta.data.recipes) {
      for (const item of [...recipe.inputs, ...recipe.outputs]) recipeNames.add(item.name);
    }
    let slug = slugify(page.title) || String(page.pageId);
    if (taken.has(`${article.category}/${slug.toLowerCase()}`)) slug = `${slug}_${page.pageId}`;
    taken.add(`${article.category}/${slug.toLowerCase()}`);
    const file = `${article.category}/${slug}.md`;
    const text = toFrontmatter(article.meta) + article.body;
    if (factTitles.has(page.title))
      factPages.set(page.title, { path: `wiki/${file}`, url: article.meta.source, revId: page.revId, body: article.body });
    const existing = archive.get(page.pageId);
    if (!existing) missing.push(page.title);
    else if (existing.meta.revId !== page.revId)
      outdated.push({ title: page.title, archived: existing.meta.revId, live: page.revId });
    if (existing && existing.file !== file) deletes.push(existing.file);
    if (!existing || existing.file !== file || existing.text !== text) writes.push({ file, text });
  }
  const removed: string[] = [];
  for (const [pageId, entry] of archive) {
    if (kept.has(pageId) || entry.meta.status === 'removed') continue;
    removed.push(entry.meta.title ?? '');
    writes.push({ file: entry.file, text: entry.text.replace(/^status: "current"$/m, 'status: "removed"') });
  }
  const unknownNames = [...recipeNames].filter(name => name && !titles.has(name.toLowerCase())).sort();
  return { writes, deletes, excluded, outdated, missing, removed, titles, unknownNames, factPages };
}

// Recipe ingredients named by an old title (e.g. "Rigogen") reach their page through a wiki redirect.
// Returns { aliases: { oldName: currentTitle }, unlinked: [names with no in-scope page] }.
async function resolveAliases(
  names: string[],
  titles: Set<string>
): Promise<{ aliases: Record<string, string>; unlinked: string[] }> {
  const aliases: Record<string, string> = {};
  for (let i = 0; i < names.length; i += BATCH) {
    const { query } = Redirects.parse(
      await api({ action: 'query', redirects: 1, titles: names.slice(i, i + BATCH).join('|') })
    );
    const normalized = new Map((query.normalized ?? []).map(entry => [entry.to, entry.from]));
    for (const redirect of query.redirects ?? []) {
      if (titles.has(redirect.to.toLowerCase())) aliases[normalized.get(redirect.from) ?? redirect.from] = redirect.to;
    }
    await sleep(REQUEST_DELAY_MS);
  }
  const sorted = Object.fromEntries(Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b)));
  return { aliases: sorted, unlinked: names.filter(name => !(name in sorted)) };
}

async function writeVerification(report: object): Promise<void> {
  await fs.writeFile(path.join(WIKI_DIR, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function sync({ dryRun }: { dryRun: boolean }): Promise<boolean> {
  const checkedAt = new Date().toISOString();
  let livePages: Page[];
  try {
    const scope = await fetchScope();
    console.log(`🔎 ${scope.size} wiki pages in scope (game-data infoboxes and mechanics pages).`);
    livePages = await fetchRevisions(scope);
  } catch (err) {
    // Nothing has been written yet: the committed archive stays as it was, and the Codex shows why it wasn't checked.
    if (err instanceof InvalidResponse) {
      console.error(`❌ The wiki returned data the mirror can't validate: ${err.message}. Nothing was written.`);
      await writeVerification({ checkedAt, wiki: WIKI_BASE, status: 'invalid-response', reason: err.message });
    } else {
      console.warn(`⚠️  Wiki unreachable (${describe(err)}); the archive was not checked.`);
      await writeVerification({ checkedAt, wiki: WIKI_BASE, status: 'unreachable' });
    }
    return false;
  }

  const changes = plan(livePages, await readArchive());
  const { stale: staleFacts } = checkFacts(changes.factPages);
  for (const fact of staleFacts) console.warn(`⚠️  Cited fact ${fact.id} (${fact.page}): ${fact.reason}. Update packages/wiki/src/facts.ts.`);
  const committedAliases = await fs.readFile(path.join(WIKI_DIR, 'aliases.json'), 'utf8').catch(() => '');
  const { aliases, unlinked } = await resolveAliases(changes.unknownNames, changes.titles).catch((err: unknown) => {
    // Keep the committed map if the wiki drops mid-sync; renamed ingredients then resolve as they did before.
    console.warn(`⚠️  Couldn't refresh redirect aliases (${describe(err)}); keeping the committed aliases.json.`);
    return { aliases: Aliases.parse(JSON.parse(committedAliases || '{}')), unlinked: changes.unknownNames };
  });
  const aliasesText = `${JSON.stringify(aliases, null, 2)}\n`;
  const aliasesChanged = committedAliases !== aliasesText;
  const differences = changes.writes.length + changes.deletes.length + (aliasesChanged ? 1 : 0);
  if (!dryRun) {
    // Writes first, then deletes: if the disk fails partway, a renamed page exists twice rather than not at all.
    for (const { file, text } of changes.writes) {
      await fs.mkdir(path.dirname(path.join(WIKI_DIR, file)), { recursive: true });
      await fs.writeFile(path.join(WIKI_DIR, file), text, 'utf8');
    }
    // A rename that only changes letter case writes into the same file on case-insensitive disks (macOS), so the old
    // name must not be deleted there; on case-sensitive disks (Linux, CI) it is a separate file and must go.
    const writtenByLowerCase = new Map(changes.writes.map(write => [write.file.toLowerCase(), write.file]));
    for (const file of changes.deletes) {
      const twin = writtenByLowerCase.get(file.toLowerCase());
      if (twin) {
        const [old, current] = await Promise.all(
          [file, twin].map(name => fs.stat(path.join(WIKI_DIR, name)).catch(() => null))
        );
        if (!old || (current && old.ino === current.ino && old.dev === current.dev)) continue;
      }
      await fs.rm(path.join(WIKI_DIR, file), { force: true });
    }
    if (aliasesChanged) await fs.writeFile(path.join(WIKI_DIR, 'aliases.json'), aliasesText, 'utf8');
  }

  const archived = [...(await readArchive()).values()];
  const pages = livePages.length - changes.excluded.length;
  const report = {
    checkedAt,
    wiki: WIKI_BASE,
    status: dryRun && differences ? 'differs' : 'match',
    pages,
    matched: dryRun ? pages - changes.outdated.length - changes.missing.length : pages,
    obsolete: archived.filter(entry => entry.meta.status === 'current' && entry.meta.obsolete).length,
    excluded: changes.excluded.length,
    removed: archived
      .filter(entry => entry.meta.status === 'removed')
      .map(entry => entry.meta.title)
      .sort(),
    aliases: Object.keys(aliases).length,
    unlinkedIngredients: unlinked,
    facts: Object.keys(FACTS).length,
    staleFacts,
    ...(dryRun
      ? {
          outdated: changes.outdated,
          missing: changes.missing,
          removedUpstream: changes.removed,
          filesToRewrite: differences
        }
      : {})
  };
  await writeVerification(report);

  if (dryRun) {
    if (staleFacts.length) console.log(`❌ ${staleFacts.length} cited fact(s) no longer match the wiki.`);
    console.log(
      differences
        ? `❌ The archive differs from the wiki: ${changes.outdated.length} outdated, ${changes.missing.length} missing, ${changes.removed.length} removed upstream, ${differences} file(s) to rewrite. Run npm run sync:wiki.`
        : `✅ The archive matches the wiki: ${report.matched}/${pages} pages at their latest revision.`
    );
    return !differences && !staleFacts.length;
  }
  console.log(
    `✅ Synced ${pages} pages: ${changes.writes.length} written, ${changes.deletes.length} renamed, ${changes.removed.length} marked removed, ${changes.excluded.length} player-found pages skipped.`
  );
  return true;
}

// ---------------------------------------------------------------------------
// Indexes (derived, git-ignored): index.json, offline-bundle.js, game-data.json, facts.json
// Committed inputs: the .md archive and aliases.json.
// ---------------------------------------------------------------------------
async function buildIndexes(): Promise<void> {
  const articles: (Record<string, unknown> & { category: string; title: string })[] = [];
  const items: object[] = [];
  for (const base of ['', 'custom/']) {
    for (const folder of FOLDERS) {
      const dir = path.join(WIKI_DIR, base, folder);
      const files = (await fs.readdir(dir).catch(() => [])).filter(file => file.endsWith('.md')).sort();
      for (const file of files) {
        const parsed = parseFrontmatter(await fs.readFile(path.join(dir, file), 'utf8'));
        const { body } = parsed;
        // Hand-written articles in custom/ only need a title and summary; unquoted numbers ("title: 1984") are text.
        const meta = base
          ? CustomMeta.parse(parsed.meta)
          : readMeta(`${base}${folder}/${file}`, parsed.meta);
        const slug = file.slice(0, -3);
        const isWiki = !base && Boolean(meta.revId);
        const entry = {
          title: meta.title || slug.replace(/_/g, ' '),
          slug,
          category: folder,
          path: `wiki/${base}${folder}/${file}`,
          summary: meta.summary || summarize(body),
          source: isWiki ? 'wiki' : 'custom',
          ...(isWiki
            ? {
                url: meta.source,
                kind: meta.kind,
                revId: meta.revId,
                revTimestamp: meta.revTimestamp,
                version: meta.version,
                ...(meta.obsolete ? { obsolete: true } : {}),
                ...(meta.status === 'removed' ? { removed: true } : {})
              }
            : {})
        };
        articles.push({ ...entry, body, ...(meta.data?.recipes?.length ? { recipes: meta.data.recipes } : {}) });
        if (isWiki)
          items.push({
            ...entry,
            fields: meta.data?.fields || {},
            value: meta.data?.value,
            recipes: meta.data?.recipes || []
          });
      }
    }
  }
  articles.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

  const aliases = Aliases.parse(
    JSON.parse(await fs.readFile(path.join(WIKI_DIR, 'aliases.json'), 'utf8').catch(() => '{}'))
  );
  // The light index only carries what the main app's header search shows.
  const index = articles.map(({ title, category, path, summary, source, obsolete, removed }) => ({
    title,
    category,
    path,
    summary,
    source,
    ...(obsolete ? { obsolete } : {}),
    ...(removed ? { removed } : {})
  }));
  await fs.writeFile(path.join(WIKI_DIR, 'index.json'), `${JSON.stringify(index)}\n`, 'utf8');
  // Loaded via <script>: the Codex's full-text search, and the fallback when fetch() is unavailable (file://).
  await fs.writeFile(
    path.join(WIKI_DIR, 'offline-bundle.js'),
    `window.WIKI_OFFLINE_BUNDLE = ${JSON.stringify({ aliases, articles })};\n`,
    'utf8'
  );
  // The structured dataset for deterministic tools: one record per wiki page, recipes included.
  await fs.writeFile(
    path.join(WIKI_DIR, 'game-data.json'),
    `${JSON.stringify({ schema: 1, source: WIKI_BASE, license: LICENSE, aliases, items })}\n`,
    'utf8'
  );
  // The cited facts whose quote is in the archived page; the app applies none other.
  const factPages = new Map<string, FactPage>();
  for (const article of articles) {
    if (article.source !== 'wiki' || article.removed || typeof article.body !== 'string') continue;
    factPages.set(article.title, {
      path: String(article.path),
      url: String(article.url),
      revId: Number(article.revId),
      body: article.body
    });
  }
  const { found, stale } = checkFacts(factPages);
  for (const fact of stale) console.warn(`⚠️  Cited fact ${fact.id} (${fact.page}) left out: ${fact.reason}.`);
  await fs.writeFile(path.join(WIKI_DIR, 'facts.json'), `${JSON.stringify({ schema: 1, facts: found }, null, 2)}\n`, 'utf8');
  console.log(
    `🎉 Indexed ${articles.length} articles (${items.length} wiki pages) into wiki/index.json, offline-bundle.js and game-data.json`
  );
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  await fs.mkdir(WIKI_DIR, { recursive: true });
  if (args.includes('--verify')) {
    process.exitCode = (await sync({ dryRun: true })) ? 0 : 1;
    return;
  }
  if (!args.includes('--index-only')) await sync({ dryRun: false });
  await buildIndexes();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((err: unknown) => {
    console.error('❌ sync-wiki failed:', err);
    process.exitCode = 1;
  });
}
