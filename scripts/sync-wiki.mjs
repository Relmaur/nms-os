#!/usr/bin/env node
// Harvests No Man's Sky wiki articles into wiki/<folder>/<slug>.md and rebuilds the Codex indexes.
//
//   node scripts/sync-wiki.mjs               seed starter pack + harvest the MediaWiki API + reindex
//   node scripts/sync-wiki.mjs --seed-only   seed starter pack + reindex (no network)
//   node scripts/sync-wiki.mjs --index-only  reindex only (e.g. after dropping custom .md files into wiki/)
//   node scripts/sync-wiki.mjs --limit=25    cap harvested pages per category (quick test runs)
//
// Zero dependencies — Node 18+ (native fetch).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_ARTICLES } from './seed-articles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIKI_DIR = path.join(ROOT, 'wiki');
const WIKI_API = 'https://nomanssky.fandom.com/api.php';
const WIKI_PAGE_BASE = 'https://nomanssky.fandom.com/wiki/';
const USER_AGENT = 'nms-os-sync-wiki/2.0 (personal offline companion app)';
const SEED_DATE = '2026-10-26';
const REQUEST_DELAY_MS = 150;
const CONCURRENCY = 3;

const TARGETS = [
  { folder: 'resources', categories: ['Raw_Materials'] },
  { folder: 'products', categories: ['Products_-_Component', 'Trade_commodity'] },
  { folder: 'cooking', categories: ['Edible_Product'] },
  { folder: 'technology', categories: ['Technology'] },
  { folder: 'guides', categories: ['Mechanics'] }
];
const FOLDERS = TARGETS.map(t => t.folder);

// Archived pre-update variants such as "Consumable (Atlas)" duplicate the current page.
const ARCHIVED_VARIANT = /\((Atlas|Beyond|Origins|NEXT|Foundation|Pathfinder|Atlas Rises|Abyss|Visions|Synthesis|Living Ship|ExoMech|Desolation|Frontiers|Prisms|Expeditions|Waypoint|Interceptor|Fractal|Singularity|Echoes|Orbital|Worlds Part I+)\)$/i;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function slugify(title) {
  return title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
}

// ---------------------------------------------------------------------------
// Frontmatter (string values are JSON-quoted, which is valid YAML)
// ---------------------------------------------------------------------------
function toFrontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'number' ? value : JSON.stringify(String(value))}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value.startsWith('"')) {
      try { value = JSON.parse(value); } catch { value = value.slice(1, -1); }
    } else if (value.startsWith("'")) {
      value = value.slice(1, -1).replace(/''/g, "'");
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      value = Number(value);
    }
    meta[kv[1]] = value;
  }
  return { meta, body: text.slice(match[0].length) };
}

// ---------------------------------------------------------------------------
// HTML -> Markdown (tuned for Fandom's parser output)
// ---------------------------------------------------------------------------
const NAMED_ENTITIES = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—', rarr: '→', larr: '←', times: '×', hellip: '…', deg: '°' };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n === 160 ? 32 : n) : whole;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function inlineText(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, ' / ')
      .replace(/<(b|strong)>\s*([\s\S]*?)\s*<\/\1>/gi, (_, __, inner) => (inner ? `**${inner}**` : ''))
      .replace(/<\/(div|p|li|td|th|tr|dd|dt)>/gi, ' ')
      .replace(/<[^>]+>/g, '')
  ).replace(/\s+/g, ' ').replace(/ ([.,;:!?)])/g, '$1').replace(/(\s*\/\s*)+$/, '').trim();
}

function tableToMarkdown(attrs, inner, context) {
  const rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
    [...row[1].matchAll(/<(th|td)([^>]*)>([\s\S]*?)<\/\1>/gi)].map(cell => ({
      header: cell[1].toLowerCase() === 'th',
      span: Math.min(parseInt(cell[2].match(/colspan="?(\d+)/i)?.[1] || '1', 10), 12),
      text: inlineText(cell[3]).replace(/\|/g, '\\|')
    }))
  ).filter(cells => cells.some(cell => cell.text));
  if (!rows.length) return '';

  // Infoboxes become a "Quick Facts" list of label/value pairs. Fandom renders a second
  // (mobile) copy of the same infobox, so only the first one is kept.
  if (/infobox/i.test(attrs)) {
    if (context.infoboxSeen) return '';
    context.infoboxSeen = true;
    const facts = rows
      .filter(cells => cells.length === 2 && cells[0].text && cells[1].text)
      .map(([label, value]) => `- **${label.text}:** ${value.text}`);
    return facts.length ? `## Quick Facts\n\n${facts.join('\n')}` : '';
  }

  const width = Math.max(...rows.map(cells => cells.reduce((sum, cell) => sum + cell.span, 0)));
  if (width === 1 || rows.length === 1) {
    return rows.map(cells => `- ${cells.map(cell => cell.text).filter(Boolean).join(' — ')}`).join('\n');
  }
  const grid = rows.map(cells => {
    const line = cells.flatMap(cell => [cell.text, ...Array(cell.span - 1).fill('')]);
    while (line.length < width) line.push('');
    return `| ${line.join(' | ')} |`;
  });
  grid.splice(1, 0, `|${' --- |'.repeat(width)}`);
  return grid.join('\n');
}

export function htmlToMarkdown(html, title) {
  let h = html;
  // Footer navboxes are always last; everything after the first one is site chrome.
  const navbox = h.search(/<table[^>]*class="[^"]*\bnavbox\b/i);
  if (navbox !== -1) h = h.slice(0, navbox);

  h = h
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<table[^>]*class="[^"]*\bambox\b[\s\S]*?<\/table>/gi, '')
    .replace(/<div class="mobileonly"[\s\S]*?<\/div>/gi, '')
    .replace(/<span class="mw-editsection-bracket">[^<]*<\/span>/gi, '')
    .replace(/<span class="mw-editsection">[\s\S]*?<\/span>/gi, '')
    .replace(/<span class="tooltip-content">[\s\S]*?<\/span>/gi, '')
    .replace(/<ul class="gallery[\s\S]*?<\/ul>/gi, '')
    .replace(/<sup[^>]*class="[^"]*reference[\s\S]*?<\/sup>/gi, '')
    .replace(/<img[^>]*>/gi, '');

  // Convert innermost tables first so nested tables collapse cleanly.
  const innermostTable = /<table([^>]*)>((?:(?!<table)[\s\S])*?)<\/table>/i;
  const context = { infoboxSeen: false };
  for (let m = h.match(innermostTable); m; m = h.match(innermostTable)) {
    h = `${h.slice(0, m.index)}\n\n${tableToMarkdown(m[1], m[2], context)}\n\n${h.slice(m.index + m[0].length)}`;
  }

  const md = decodeEntities(
    h
      .replace(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => `\n\n${'#'.repeat(Number(level))} ${inlineText(inner)}\n\n`)
      .replace(/<(b|strong)>\s*([\s\S]*?)\s*<\/\1>/gi, (_, __, inner) => (inner ? `**${inner}**` : ''))
      .replace(/<(i|em)>\s*([\s\S]*?)\s*<\/\1>/gi, (_, __, inner) => (inner ? `*${inner}*` : ''))
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `\n- ${inlineText(inner)}`)
      .replace(/<dt[^>]*>([\s\S]*?)<\/dt>/gi, (_, inner) => `\n\n**${inlineText(inner)}**\n`)
      .replace(/<dd[^>]*>([\s\S]*?)<\/dd>/gi, (_, inner) => `\n${inlineText(inner)}\n`)
      .replace(/<\/?(ul|ol|dl)[^>]*>/gi, '\n')
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/^ +(?=[^ -])/gm, '')
    .replace(/ ([.,;:!?)])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^(- .*)\n\n(?=- )/gm, '$1\n')
    .replace(/(\n#{2,4} [^\n]*)+\s*$/, '')
    .trim();

  return `# ${title}\n\n${md}\n`;
}

function summarize(markdown) {
  const paragraph = markdown
    .split(/\n{2,}/)
    .map(block => block.trim())
    .find(block => block && !/^(#|\||-|>|\*\*[^*]+:\*\*)/.test(block) && block.length > 40);
  const text = (paragraph || '').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text;
}

// ---------------------------------------------------------------------------
// MediaWiki API
// ---------------------------------------------------------------------------
async function api(params, attempt = 1) {
  const url = new URL(WIKI_API);
  Object.entries({ format: 'json', formatversion: '2', ...params }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await sleep(1000 * 2 ** attempt);
    return api(params, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();
  if (data.error) throw new Error(`${data.error.code}: ${data.error.info}`);
  return data;
}

async function fetchCategoryMembers(category, limit) {
  const members = [];
  let cmcontinue;
  do {
    const data = await api({
      action: 'query', list: 'categorymembers', cmtitle: `Category:${category}`,
      cmnamespace: 0, cmtype: 'page', cmlimit: Math.min(500, limit - members.length),
      ...(cmcontinue && { cmcontinue })
    });
    members.push(...(data.query?.categorymembers || []));
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue && members.length < limit);
  return members;
}

async function fetchArticleHtml(pageId) {
  const data = await api({ action: 'parse', pageid: pageId, prop: 'text|revid', disabletoc: 1, disableeditsection: 1 });
  return data.parse?.text || '';
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------
async function writeSeeds() {
  for (const seed of SEED_ARTICLES) {
    const dir = path.join(WIKI_DIR, seed.folder);
    await fs.mkdir(dir, { recursive: true });
    const frontmatter = toFrontmatter({ title: seed.title, category: seed.folder, summary: seed.summary, source: 'seed', updated: SEED_DATE });
    await fs.writeFile(path.join(dir, `${slugify(seed.title)}.md`), `${frontmatter}# ${seed.title}\n\n${seed.body}\n`, 'utf8');
  }
  console.log(`✅ Seeded ${SEED_ARTICLES.length} core offline .md articles.`);
}

async function harvest(limitPerCategory) {
  const seedSlugs = new Set(SEED_ARTICLES.map(seed => slugify(seed.title).toLowerCase()));
  const claimed = new Set();
  const jobs = [];

  for (const target of TARGETS) {
    for (const category of target.categories) {
      try {
        const members = await fetchCategoryMembers(category, limitPerCategory);
        let queued = 0;
        for (const member of members) {
          let slug = slugify(member.title) || `page_${member.pageid}`;
          // Keep both the curated seed note and the full wiki page when titles collide.
          if (seedSlugs.has(slug.toLowerCase())) slug += '_wiki';
          const key = slug.toLowerCase();
          if (ARCHIVED_VARIANT.test(member.title) || claimed.has(key)) continue;
          claimed.add(key);
          jobs.push({ ...member, slug, folder: target.folder });
          queued++;
        }
        console.log(`📂 ${category} → ${target.folder}/ (${queued} pages queued)`);
      } catch (err) {
        console.warn(`⚠️  Skipped ${category}: ${err.message}`);
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  let done = 0;
  let failed = 0;
  const worker = async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      try {
        const markdown = htmlToMarkdown(await fetchArticleHtml(job.pageid), job.title);
        const frontmatter = toFrontmatter({
          title: job.title,
          category: job.folder,
          pageId: job.pageid,
          summary: summarize(markdown),
          source: WIKI_PAGE_BASE + encodeURIComponent(job.title.replace(/ /g, '_')),
          license: 'CC BY-SA 3.0 (No Man\'s Sky Wiki contributors)',
          updated: today
        });
        const dir = path.join(WIKI_DIR, job.folder);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, `${job.slug}.md`), frontmatter + markdown, 'utf8');
        if (++done % 50 === 0) console.log(`   …${done} articles written`);
      } catch (err) {
        failed++;
        console.warn(`⚠️  ${job.title}: ${err.message}`);
      }
      await sleep(REQUEST_DELAY_MS);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`🌐 Harvested ${done} articles${failed ? ` (${failed} failed)` : ''}.`);
}

// Rebuilds wiki/index.json and wiki/offline-bundle.js from every .md file on disk,
// so hand-written articles dropped into wiki/<folder>/ are picked up too.
// Generated articles live in wiki/<folder>/ (git-ignored); hand-written ones in wiki/custom/<folder>/ (committed).
async function buildIndexes() {
  const articles = [];
  for (const base of ['', 'custom/']) {
    for (const folder of FOLDERS) {
      const dir = path.join(WIKI_DIR, base, folder);
      const files = (await fs.readdir(dir).catch(() => [])).filter(file => file.endsWith('.md'));
      for (const file of files) {
        const { meta, body } = parseFrontmatter(await fs.readFile(path.join(dir, file), 'utf8'));
        const slug = file.slice(0, -3);
        const url = /^https?:\/\//.test(meta.source || '') ? meta.source : undefined;
        articles.push({
          title: String(meta.title || slug.replace(/_/g, ' ')),
          slug,
          category: folder,
          path: `wiki/${base}${folder}/${file}`,
          summary: String(meta.summary || summarize(body)),
          source: base ? 'custom' : meta.source === 'seed' ? 'seed' : url ? 'wiki' : 'custom',
          url,
          body
        });
      }
    }
  }
  articles.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

  const index = articles.map(({ body, ...entry }) => entry);
  await fs.writeFile(path.join(WIKI_DIR, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  // Loaded via <script> only when fetch() is unavailable (index.html opened via file://).
  const bundle = { generated: new Date().toISOString(), articles };
  await fs.writeFile(path.join(WIKI_DIR, 'offline-bundle.js'), `window.WIKI_OFFLINE_BUNDLE = ${JSON.stringify(bundle)};\n`, 'utf8');
  console.log(`🎉 Indexed ${articles.length} .md articles into wiki/index.json + wiki/offline-bundle.js`);
}

async function run() {
  const args = process.argv.slice(2);
  const indexOnly = args.includes('--index-only');
  const seedOnly = args.includes('--seed-only');
  const limit = Number(args.find(arg => arg.startsWith('--limit='))?.split('=')[1]) || 2000;

  await fs.mkdir(WIKI_DIR, { recursive: true });
  if (!indexOnly) await writeSeeds();
  if (!indexOnly && !seedOnly) await harvest(limit);
  await buildIndexes();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(err => {
    console.error('❌ sync-wiki failed:', err);
    process.exitCode = 1;
  });
}
