#!/usr/bin/env node
// Mirrors the game-data pages of the No Man's Sky wiki into wiki/<category>/<slug>.md and rebuilds the Codex indexes.
//
//   node scripts/sync-wiki.mjs               sync every in-scope page from the live wiki, record the verification, reindex
//   node scripts/sync-wiki.mjs --verify      dry run: report how the archive differs from the live wiki (exit 1 if it does)
//   node scripts/sync-wiki.mjs --index-only  reindex the committed archive only (no network)
//
// Scope: main-namespace pages that use one of the game-data infoboxes in SCOPE. Player discoveries (planets,
// creatures, bases, player-found ships and multi-tools) and community pages are out of scope.
// Every article is rendered from the page's wikitext at a recorded revision id. MediaWiki revisions are immutable,
// so an archived revId equal to the live revId means the copy matches the wiki's source exactly.
//
// Zero dependencies — Node 18+ (native fetch).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WIKI_BASE, LICENSE, SCOPE, FOLDERS, slugify, toFrontmatter, parseFrontmatter, summarize, buildArticle } from './lib/wikitext.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIKI_DIR = path.join(ROOT, 'wiki');
const WIKI_API = `${WIKI_BASE}/api.php`;
const USER_AGENT = 'nms-os-sync-wiki/3.0 (personal offline companion app)';
const BATCH = 50; // pages per revisions request (the API maximum for content)
const REQUEST_DELAY_MS = 250;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// MediaWiki API
// ---------------------------------------------------------------------------
async function api(params, attempt = 1) {
  const url = new URL(WIKI_API);
  Object.entries({ format: 'json', formatversion: '2', ...params }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const data = await res.json();
    if (data.error) throw new Error(`${data.error.code}: ${data.error.info}`);
    return data;
  } catch (err) {
    if (attempt >= 4) throw err;
    await sleep(1000 * 2 ** attempt);
    return api(params, attempt + 1);
  }
}

// pageId -> { pageId, title, kind } for every page embedding an in-scope infobox.
async function fetchScope() {
  const pages = new Map();
  for (const [template, kind] of Object.entries(SCOPE)) {
    let cont = {};
    while (cont) {
      const data = await api({ action: 'query', list: 'embeddedin', eititle: `Template:${template}`, einamespace: 0, eilimit: 500, ...cont });
      for (const page of data.query.embeddedin) {
        if (!pages.has(page.pageid)) pages.set(page.pageid, { pageId: page.pageid, title: page.title, kind });
      }
      cont = data.continue || null;
      await sleep(REQUEST_DELAY_MS);
    }
  }
  return pages;
}

async function fetchRevisions(scope) {
  const ids = [...scope.keys()].sort((a, b) => a - b);
  const pages = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const data = await api({ action: 'query', prop: 'revisions', rvprop: 'ids|timestamp|content', rvslots: 'main', pageids: ids.slice(i, i + BATCH).join('|') });
    for (const page of data.query.pages) {
      const revision = page.revisions?.[0];
      if (!revision) continue;
      pages.push({ ...scope.get(page.pageid), title: page.title, revId: revision.revid, revTimestamp: revision.timestamp, content: revision.slots.main.content || '' });
    }
    if (process.stdout.isTTY) process.stdout.write(`\r📥 Fetched ${Math.min(i + BATCH, ids.length)}/${ids.length} pages`);
    await sleep(REQUEST_DELAY_MS);
  }
  console.log(`${process.stdout.isTTY ? '\n' : ''}📥 Fetched ${pages.length} pages.`);
  return pages;
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------
async function readArchive() {
  const byPageId = new Map();
  for (const folder of FOLDERS) {
    const dir = path.join(WIKI_DIR, folder);
    for (const file of (await fs.readdir(dir).catch(() => [])).filter(name => name.endsWith('.md'))) {
      const text = await fs.readFile(path.join(dir, file), 'utf8');
      const { meta } = parseFrontmatter(text);
      if (meta.pageId) byPageId.set(meta.pageId, { file: `${folder}/${file}`, text, meta });
    }
  }
  return byPageId;
}

// Compares the live wiki with the archive and returns what a sync would change.
function plan(livePages, archive) {
  const writes = [];
  const deletes = [];
  const excluded = [];
  const outdated = [];
  const missing = [];
  const taken = new Set();
  const kept = new Set();
  const titles = new Set();
  const recipeNames = new Set();
  for (const page of [...livePages].sort((a, b) => a.pageId - b.pageId)) {
    const article = buildArticle(page);
    if (article.excluded) { excluded.push({ title: page.title, reason: article.excluded }); continue; }
    kept.add(page.pageId);
    titles.add(page.title.toLowerCase());
    article.meta.data.recipes.forEach(recipe => [...recipe.inputs, ...recipe.outputs].forEach(item => recipeNames.add(String(item.name))));
    let slug = slugify(page.title) || String(page.pageId);
    if (taken.has(`${article.category}/${slug.toLowerCase()}`)) slug = `${slug}_${page.pageId}`;
    taken.add(`${article.category}/${slug.toLowerCase()}`);
    const file = `${article.category}/${slug}.md`;
    const text = toFrontmatter(article.meta) + article.body;
    const existing = archive.get(page.pageId);
    if (!existing) missing.push(page.title);
    else if (existing.meta.revId !== page.revId) outdated.push({ title: page.title, archived: existing.meta.revId, live: page.revId });
    if (existing && existing.file !== file) deletes.push(existing.file);
    if (!existing || existing.file !== file || existing.text !== text) writes.push({ file, text });
  }
  const removed = [];
  for (const [pageId, entry] of archive) {
    if (kept.has(pageId) || entry.meta.status === 'removed') continue;
    removed.push(entry.meta.title);
    writes.push({ file: entry.file, text: entry.text.replace(/^status: "current"$/m, 'status: "removed"') });
  }
  const unknownNames = [...recipeNames].filter(name => name && !titles.has(name.toLowerCase())).sort();
  return { writes, deletes, excluded, outdated, missing, removed, titles, unknownNames };
}

// Recipe ingredients named by an old title (e.g. "Rigogen") reach their page through a wiki redirect.
// Returns { aliases: { oldName: currentTitle }, unlinked: [names with no in-scope page] }.
async function resolveAliases(names, titles) {
  const aliases = {};
  for (let i = 0; i < names.length; i += BATCH) {
    const data = await api({ action: 'query', redirects: 1, titles: names.slice(i, i + BATCH).join('|') });
    const normalized = new Map((data.query.normalized || []).map(entry => [entry.to, entry.from]));
    for (const redirect of data.query.redirects || []) {
      if (titles.has(redirect.to.toLowerCase())) aliases[normalized.get(redirect.from) ?? redirect.from] = redirect.to;
    }
    await sleep(REQUEST_DELAY_MS);
  }
  const sorted = Object.fromEntries(Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b)));
  return { aliases: sorted, unlinked: names.filter(name => !(name in sorted)) };
}

async function writeVerification(report) {
  await fs.writeFile(path.join(WIKI_DIR, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function sync({ dryRun }) {
  const checkedAt = new Date().toISOString();
  let livePages;
  try {
    const scope = await fetchScope();
    console.log(`🔎 ${scope.size} wiki pages use a game-data infobox.`);
    livePages = await fetchRevisions(scope);
  } catch (err) {
    console.warn(`⚠️  Wiki unreachable (${err.message}); the archive was not checked.`);
    await writeVerification({ checkedAt, wiki: WIKI_BASE, status: 'unreachable' });
    return false;
  }

  const changes = plan(livePages, await readArchive());
  const committedAliases = await fs.readFile(path.join(WIKI_DIR, 'aliases.json'), 'utf8').catch(() => '');
  const { aliases, unlinked } = await resolveAliases(changes.unknownNames, changes.titles)
    .catch(() => ({ aliases: JSON.parse(committedAliases || '{}'), unlinked: changes.unknownNames })); // keep the committed map if the wiki drops mid-sync
  const aliasesText = `${JSON.stringify(aliases, null, 2)}\n`;
  const aliasesChanged = committedAliases !== aliasesText;
  const differences = changes.writes.length + changes.deletes.length + (aliasesChanged ? 1 : 0);
  if (!dryRun) {
    for (const file of changes.deletes) await fs.rm(path.join(WIKI_DIR, file), { force: true });
    for (const { file, text } of changes.writes) {
      await fs.mkdir(path.dirname(path.join(WIKI_DIR, file)), { recursive: true });
      await fs.writeFile(path.join(WIKI_DIR, file), text, 'utf8');
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
    removed: archived.filter(entry => entry.meta.status === 'removed').map(entry => entry.meta.title).sort(),
    aliases: Object.keys(aliases).length,
    unlinkedIngredients: unlinked,
    ...(dryRun && { outdated: changes.outdated, missing: changes.missing, removedUpstream: changes.removed, filesToRewrite: differences })
  };
  await writeVerification(report);

  if (dryRun) {
    console.log(differences
      ? `❌ The archive differs from the wiki: ${changes.outdated.length} outdated, ${changes.missing.length} missing, ${changes.removed.length} removed upstream, ${differences} file(s) to rewrite. Run npm run sync:wiki.`
      : `✅ The archive matches the wiki: ${report.matched}/${pages} pages at their latest revision.`);
    return !differences;
  }
  console.log(`✅ Synced ${pages} pages: ${changes.writes.length} written, ${changes.deletes.length} renamed, ${changes.removed.length} marked removed, ${changes.excluded.length} player-found pages skipped.`);
  return true;
}

// ---------------------------------------------------------------------------
// Indexes (derived, git-ignored): index.json, offline-bundle.js, game-data.json
// Committed inputs: the .md archive and aliases.json.
// ---------------------------------------------------------------------------
async function buildIndexes() {
  const articles = [];
  const items = [];
  for (const base of ['', 'custom/']) {
    for (const folder of FOLDERS) {
      const dir = path.join(WIKI_DIR, base, folder);
      const files = (await fs.readdir(dir).catch(() => [])).filter(file => file.endsWith('.md')).sort();
      for (const file of files) {
        const { meta, body } = parseFrontmatter(await fs.readFile(path.join(dir, file), 'utf8'));
        const slug = file.slice(0, -3);
        const isWiki = !base && Boolean(meta.revId);
        const entry = {
          title: String(meta.title || slug.replace(/_/g, ' ')),
          slug,
          category: folder,
          path: `wiki/${base}${folder}/${file}`,
          summary: String(meta.summary || summarize(body)),
          source: isWiki ? 'wiki' : 'custom',
          ...(isWiki && {
            url: meta.source,
            kind: meta.kind,
            revId: meta.revId,
            revTimestamp: meta.revTimestamp,
            version: meta.version,
            ...(meta.obsolete && { obsolete: true }),
            ...(meta.status === 'removed' && { removed: true })
          })
        };
        articles.push({ ...entry, body, ...(meta.data?.recipes?.length && { recipes: meta.data.recipes }) });
        if (isWiki) items.push({ ...entry, fields: meta.data?.fields || {}, value: meta.data?.value, recipes: meta.data?.recipes || [] });
      }
    }
  }
  articles.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

  const aliases = JSON.parse(await fs.readFile(path.join(WIKI_DIR, 'aliases.json'), 'utf8').catch(() => '{}'));
  // The light index only carries what the main app's header search shows.
  const index = articles.map(({ title, category, path, summary, source, obsolete, removed }) => ({ title, category, path, summary, source, ...(obsolete && { obsolete }), ...(removed && { removed }) }));
  await fs.writeFile(path.join(WIKI_DIR, 'index.json'), `${JSON.stringify(index)}\n`, 'utf8');
  // Loaded via <script>: the Codex's full-text search, and the fallback when fetch() is unavailable (file://).
  await fs.writeFile(path.join(WIKI_DIR, 'offline-bundle.js'), `window.WIKI_OFFLINE_BUNDLE = ${JSON.stringify({ aliases, articles })};\n`, 'utf8');
  // The structured dataset for deterministic tools: one record per wiki page, recipes included.
  await fs.writeFile(path.join(WIKI_DIR, 'game-data.json'), `${JSON.stringify({ schema: 1, source: WIKI_BASE, license: LICENSE, aliases, items })}\n`, 'utf8');
  console.log(`🎉 Indexed ${articles.length} articles (${items.length} wiki pages) into wiki/index.json, offline-bundle.js and game-data.json`);
}

async function run() {
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
  run().catch(err => {
    console.error('❌ sync-wiki failed:', err);
    process.exitCode = 1;
  });
}
