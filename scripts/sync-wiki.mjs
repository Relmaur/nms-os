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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIKI_DIR = path.join(ROOT, 'wiki');
const WIKI_BASE = 'https://nomanssky.fandom.com';
const WIKI_API = `${WIKI_BASE}/api.php`;
const LICENSE = "CC BY-SA 3.0 (No Man's Sky Wiki contributors)";
const USER_AGENT = 'nms-os-sync-wiki/3.0 (personal offline companion app)';
const BATCH = 50; // pages per revisions request (the API maximum for content)
const REQUEST_DELAY_MS = 250;

// Infobox template -> kind, in priority order (a page's kind is the first of these it embeds).
const SCOPE = {
  'Resource infobox': 'resource',
  'Product infobox': 'product',
  'Technology infobox NEXT': 'technology',
  'Technology infobox': 'technology',
  'POI infobox': 'place',
  'Space Encounter infobox': 'encounter',
  'Mission infobox': 'mission',
  'Milestone infobox': 'milestone',
  'Galaxy infobox': 'galaxy',
  'Update infobox': 'update'
};
const SCOPE_KEYS = new Set(Object.keys(SCOPE).map(name => name.toLowerCase()));
const FOLDERS = ['resources', 'products', 'cooking', 'fish', 'building', 'technology', 'places', 'missions', 'galaxies', 'updates'];

// Pages the wiki keeps for an older version of the game, e.g. "Blaze Javelin (Atlas)".
const ARCHIVED_VARIANT = /\((Release|Foundation|Pathfinder|Atlas|Atlas Rises|NEXT|Abyss|Visions|Beyond|Synthesis|Living Ship|ExoMech|Desolation|Origins|Frontiers|Prisms|Expeditions|Waypoint|Interceptor|Fractal|Singularity|Echoes|Orbital|Worlds Part I+)\)$/i;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Must match WikiSearch.slugify() in assets/wiki-search.js.
function slugify(title) {
  return title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
}

// ---------------------------------------------------------------------------
// Frontmatter (strings and objects are JSON, which is valid YAML)
// ---------------------------------------------------------------------------
function toFrontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'number' || typeof value === 'boolean' ? value : JSON.stringify(typeof value === 'object' ? value : String(value))}`);
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
    if (/^["{[]/.test(value)) {
      try { value = JSON.parse(value); } catch { value = value.slice(1, -1); }
    } else if (value.startsWith("'")) {
      value = value.slice(1, -1).replace(/''/g, "'");
    } else if (value === 'true' || value === 'false') {
      value = value === 'true';
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      value = Number(value);
    }
    meta[kv[1]] = value;
  }
  return { meta, body: text.slice(match[0].length) };
}

// ---------------------------------------------------------------------------
// Wikitext parsing
// ---------------------------------------------------------------------------
// Index just past the "}}" that closes the "{{" at start, or -1.
function closeBraces(text, start) {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; }
    else if (text[i] === '}' && text[i + 1] === '}') { depth--; i++; if (depth === 0) return i + 1; }
  }
  return -1;
}

// Split on a separator that is not inside {{templates}} or [[links]].
function splitTop(text, sep = '|') {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const two = text.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; current += two; i++; continue; }
    if ((two === '}}' || two === ']]') && depth > 0) { depth--; current += two; i++; continue; }
    if (text[i] === sep && depth === 0) { parts.push(current); current = ''; continue; }
    current += text[i];
  }
  parts.push(current);
  return parts;
}

function parseTemplate(inner) {
  const [rawName, ...rest] = splitTop(inner);
  const name = rawName.trim().replace(/_/g, ' ').replace(/^template:/i, '');
  const positional = [];
  const named = {};
  for (const part of rest) {
    const kv = part.match(/^\s*(\w[\w\s-]*?)\s*=([\s\S]*)$/);
    if (!kv) positional.push(part.trim());
    else if (/^\d+$/.test(kv[1])) positional[Number(kv[1]) - 1] = kv[2].trim();
    else named[kv[1].toLowerCase()] = kv[2].trim();
  }
  return { name, key: name.toLowerCase(), positional: Array.from(positional, p => p ?? ''), named };
}

// Replace each top-level {{template}} with render(template); nested ones are left to the renderer.
function mapTemplates(text, render) {
  let out = '';
  let i = 0;
  while (true) {
    const start = text.indexOf('{{', i);
    if (start === -1) { out += text.slice(i); break; }
    const end = closeBraces(text, start);
    if (end === -1) { out += text.slice(i); break; }
    out += text.slice(i, start) + render(parseTemplate(text.slice(start + 2, end - 2)));
    i = end;
  }
  return out;
}

function topTemplates(text) {
  const found = [];
  mapTemplates(text, template => { found.push(template); return ''; });
  return found;
}

const ENTITIES = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—', rarr: '→', larr: '←', times: '×', hellip: '…', deg: '°' };
function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

// Inline templates that stand for a word or a link; everything else (navboxes, queries, banners,
// layout helpers) renders as nothing.
const INLINE = {
  units: () => ' Units',
  nanites: () => ' Nanites',
  quicksilver: () => ' Quicksilver',
  link: t => `[[${t.positional[0]}]]`,
  ilink: t => `[[${t.positional[0]}]]`,
  class: t => `${t.positional[0]}-class`,
  pagename: (t, ctx) => ctx.title,
  '!': () => '|'
};

// Recipe templates. Ingredient lists look like "Name,qty;Name,qty"; refiner and cooking
// recipes append ";outputQty;seconds%Label".
function parseIngredients(spec) {
  return spec.split(';').map(item => item.trim()).filter(Boolean).map(item => {
    const at = item.lastIndexOf(',');
    const qty = Number(item.slice(at + 1).trim());
    return { name: plainText(item.slice(0, at)), qty: Number.isFinite(qty) ? qty : item.slice(at + 1).trim() };
  });
}

function parseProcess(spec, type, title) {
  const pieces = spec.split(';').map(piece => piece.trim()).filter(Boolean);
  const inputs = parseIngredients(pieces.filter(piece => piece.includes(',')).join(';'));
  const [outQty, timing = ''] = pieces.filter(piece => !piece.includes(','));
  const [time, ...label] = timing.split('%');
  return {
    type, inputs, outputs: [{ name: title, qty: Number(outQty) || 1 }],
    ...(time && { seconds: Number(time) }),
    ...(label.length && label.join('%').trim() && { label: label.join('%').trim() })
  };
}

function parseRecipes(template, title) {
  const specs = template.positional.filter(Boolean);
  switch (template.key) {
    case 'craft': // "Name,qty;Name,qty" with an optional ";outputQty"
      return specs.map(spec => {
        const pieces = spec.split(';').map(piece => piece.trim()).filter(Boolean);
        const outQty = Number(pieces.find(piece => !piece.includes(','))) || 1;
        return { type: 'craft', inputs: parseIngredients(pieces.filter(piece => piece.includes(',')).join(';')), outputs: [{ name: title, qty: outQty }], ...(template.named.blueprint === 'yes' && { blueprint: true }) };
      });
    case 'craftobsolete': {
      const inputs = [];
      for (let i = 0; i + 1 < specs.length; i += 2) inputs.push({ name: plainText(specs[i]), qty: Number(specs[i + 1]) || specs[i + 1] });
      return inputs.length ? [{ type: 'craft', obsolete: true, inputs, outputs: [{ name: title, qty: 1 }] }] : [];
    }
    case 'poc-refine': return specs.map(spec => parseProcess(spec, 'refine', title));
    case 'cook': return specs.map(spec => parseProcess(spec, 'cook', title));
    case 'cookobsolete': return specs.map(spec => ({ ...parseProcess(spec, 'cook', title), obsolete: true }));
    case 'poc-repair': return specs.map(spec => ({ type: 'repair', inputs: parseIngredients(spec), outputs: [] }));
    case 'poc-dismantle': return specs.map(spec => ({ type: 'dismantle', inputs: [{ name: title, qty: 1 }], outputs: parseIngredients(spec) }));
    default: return [];
  }
}

const RECIPE_LABELS = { craft: 'Crafting', refine: 'Refiner', cook: 'Nutrient Processor', repair: 'Repair', dismantle: 'Dismantle' };
function recipeLine(recipe) {
  const list = items => items.map(item => `${item.qty} × [[${item.name}]]`).join(' + ');
  const head = [
    `**${RECIPE_LABELS[recipe.type]}${recipe.obsolete ? ' (obsolete)' : ''}**`,
    recipe.label && `*${recipe.label}*`,
    recipe.seconds !== undefined && `${recipe.seconds} s per unit`,
    recipe.blueprint && 'needs the blueprint'
  ].filter(Boolean).join(' · ');
  if (recipe.type === 'repair') return `- ${head}: ${list(recipe.inputs)}`;
  if (recipe.type === 'dismantle') return `- ${head} returns: ${list(recipe.outputs)}`;
  return `- ${head}: ${list(recipe.inputs)} → ${recipe.outputs.map(item => `${item.qty} × ${item.name}`).join(' + ')}`;
}

function expandTemplates(text, ctx) {
  return mapTemplates(text, template => {
    if (SCOPE_KEYS.has(template.key)) return '';
    const recipes = parseRecipes(template, ctx.title);
    if (recipes.length) return `\n\n${recipes.map(recipeLine).join('\n')}\n\n`;
    const inline = INLINE[template.key];
    return inline ? expandTemplates(inline(template, ctx), ctx) : '';
  });
}

// [[File:…|caption with [[links]]]] needs bracket matching, not a regex.
function removeBracketed(text, prefix) {
  let out = '';
  let i = 0;
  while (true) {
    const found = text.slice(i).search(prefix);
    if (found === -1) { out += text.slice(i); break; }
    const at = i + found;
    let depth = 0;
    let j = at;
    for (; j < text.length - 1; j++) {
      if (text[j] === '[' && text[j + 1] === '[') { depth++; j++; }
      else if (text[j] === ']' && text[j + 1] === ']') { depth--; j++; if (depth === 0) break; }
    }
    out += text.slice(i, at);
    i = j + 1;
  }
  return out;
}

function convertLinks(text) {
  return removeBracketed(text, /\[\[\s*:?(File|Image|Media|Category|[a-z]{2}(-[a-z]+)?):/i)
    .replace(/\[\[([^\]|]+?)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]([a-z]*)/g, (_, target, label, suffix) => {
      target = target.trim().replace(/_/g, ' ');
      const shown = `${label ?? target}${suffix}`.trim();
      return shown === target ? `[[${target}]]` : `[[${target}|${shown}]]`;
    })
    .replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, '[$2]($1)')
    .replace(/\[(https?:\/\/[^\s\]]+)\]/g, '<$1>');
}

function convertInline(text) {
  return text
    .replace(/('{2,5})[ \t]*\n/g, '$1') // bold/italic opened at a line end
    .replace(/'''''(.+?)'''''/g, '***$1***')
    .replace(/'''(.+?)'''/g, '**$1**')
    .replace(/''(.+?)''/g, '*$1*')
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/<\/?(span|div|small|big|center|font|u|s|abbr|p|sub|sup|nowiki|onlyinclude|includeonly|noinclude|poem|mark|b|i)\b[^>]*>/gi, '');
}

// MediaWiki tables -> Markdown tables; multi-line cells are joined with <br>.
// Innermost tables first, so a table nested in a cell doesn't leave its parent's "|}" behind.
function convertTables(text) {
  const innermost = /^[ \t]*\{\|[^\n]*\n((?:(?!^[ \t]*\{\|)[\s\S])*?)^[ \t]*\|\}[^\n]*$/m;
  while (innermost.test(text)) text = text.replace(innermost, (_, inner) => tableToMarkdown(inner));
  return text;
}

function tableToMarkdown(inner) {
  const rows = [];
  let row = null;
  let headerRow = false;
  const cellText = raw => {
    const parts = splitTop(raw);
    return (parts.length > 1 && /=|^\s*$/.test(parts[0]) ? parts.slice(1).join('|') : raw).trim();
  };
  for (const line of inner.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|+')) continue;
    if (trimmed.startsWith('|-')) { row = null; continue; }
    if (trimmed.startsWith('!') || trimmed.startsWith('|')) {
      const isHeader = trimmed.startsWith('!');
      if (!row) { row = []; rows.push(row); if (rows.length === 1) headerRow = isHeader; }
      trimmed.slice(1).split(isHeader ? /!!|\|\|/ : /\|\|/).forEach(cell => row.push([cellText(cell)]));
    } else if (row?.length && trimmed) {
      row[row.length - 1].push(trimmed.replace(/^(?:[-*#]|1\.)\s+/, '• '));
    }
  }
  if (!rows.length) return '';
  const width = Math.max(...rows.map(r => r.length));
  const cell = lines => lines.filter(Boolean).join('<br>').replace(/\[\[([^\]]*)\]\]/g, m => m.replace(/\|/g, '\\|')).replace(/\n/g, ' ') || ' ';
  const md = rows.map(r => `| ${Array.from({ length: width }, (_, i) => cell(r[i] || [])).join(' | ')} |`);
  if (!headerRow) md.unshift(`| ${Array(width).fill(' ').join(' | ')} |`);
  md.splice(1, 0, `|${Array(width).fill(' --- ').join('|')}|`);
  return `\n${md.join('\n')}\n`;
}

function convertBlocks(text) {
  return text.split('\n').map(line => {
    if (/^\s*[|!{]/.test(line)) return line; // table rows
    const heading = line.match(/^(={2,6})\s*(.+?)\s*\1\s*$/);
    if (heading) return `\n${'#'.repeat(heading[1].length)} ${heading[2].replace(/\*\*/g, '')}\n`;
    const list = line.match(/^([*#:;]+)\s*(.*)$/);
    if (!list) return line;
    const marks = list[1];
    const last = marks[marks.length - 1];
    if (last === ';') return `**${list[2]}**`;
    if (last === ':' && !/[*#]/.test(marks)) return list[2];
    return `${'  '.repeat(marks.length - 1)}${last === '#' ? '1.' : '-'} ${list[2]}`;
  }).join('\n');
}

// A heading followed only by headings of the same or a higher level (or nothing) has no content.
function dropEmptyHeadings(markdown) {
  const lines = markdown.split('\n');
  const level = line => line.match(/^(#{1,6}) /)?.[1].length || 0;
  return lines.filter((line, i) => {
    const own = level(line);
    if (!own) return true;
    const next = lines.slice(i + 1).find(other => other.trim());
    return next !== undefined && (level(next) === 0 || level(next) > own);
  }).join('\n');
}

function cleanSource(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>/]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<references\s*\/?>/gi, '')
    .replace(/<gallery[^>]*>[\s\S]*?<\/gallery>/gi, '')
    .replace(/<\/?tabber[^>]*>/gi, '')
    .replace(/__[A-Z]+__/g, '');
}

function renderWikitext(text, ctx) {
  let md = cleanSource(text);
  md = expandTemplates(md, ctx);
  md = convertLinks(md);
  md = convertBlocks(md); // before bold/italic, whose "**" would read as a list marker
  md = convertInline(md);
  md = convertTables(md);
  md = decodeEntities(md).replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
  return dropEmptyHeadings(md).replace(/\n{3,}/g, '\n\n').trim();
}

// Plain text for infobox values and ingredient names.
function plainText(text) {
  let out = cleanSource(String(text));
  out = mapTemplates(out, template => {
    const inline = INLINE[template.key];
    return inline ? plainText(inline(template, { title: '' })) : '';
  });
  out = convertLinks(out).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  out = out.replace(/<br\s*\/?>/gi, ', ').replace(/<[^>]+>/g, '').replace(/'{2,}/g, '');
  return decodeEntities(out).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Page -> article
// ---------------------------------------------------------------------------
const FACT_LABELS = {
  category: 'Category', subcategory: 'Subcategory', type: 'Type', rarity: 'Rarity', value: 'Value', symbol: 'Symbol',
  used: 'Used for', complexity: 'Base complexity', power: 'Power', level: 'Level', stats: 'Stats', recharge: 'Recharge',
  release: 'Added in', desc: 'Description', subtype: 'Subtype', order: 'Galaxy number', date: 'Release date', platform: 'Platforms',
  rewards: 'Rewards', frequency: 'Frequency', interaction: 'Interaction', system_types: 'System types', requires: 'Requires',
  series: 'Series', origin: 'Given by', implemented: 'Added in', prevmission: 'Previous mission', nextmission: 'Next mission',
  previous: 'Previous', next: 'Next'
};
const HIDDEN_FIELDS = new Set(['image', 'name', 'color', 'upgradeicon', 'link', 'alert_1', 'alert_2', 'ramifications', 'notes', 'datexbox', 'dateps', 'dateswitch', 'datepc', 'datemac', 'steam', 'gog', 'platforms', 'build']);

function categoryFor(kind, fields) {
  switch (kind) {
    case 'resource': return 'resources';
    case 'technology': return 'technology';
    case 'place': case 'encounter': return 'places';
    case 'mission': case 'milestone': return 'missions';
    case 'galaxy': return 'galaxies';
    case 'update': return 'updates';
  }
  const category = (fields.category || '').toLowerCase();
  const type = (fields.type || '').toLowerCase();
  if (category === 'fish' || type.endsWith('fish')) return 'fish';
  if (type === 'edible product' || type === 'raw ingredient') return 'cooking';
  if (/building|customisation|adornment|exhaust|container/.test(category) || /construction|decoration/.test(type)) return 'building';
  return 'products';
}

function summarize(markdown) {
  const paragraph = markdown
    .split(/\n{2,}/)
    .map(block => block.trim())
    .find(block => block && !/^(#|\||-|>|\*\*[^*]+:\*\*)/.test(block) && block.length > 20);
  const text = (paragraph || '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/<br>/g, ' ').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text;
}

// The in-game text, when the page quotes it, makes the best summary.
function gameDescription(markdown) {
  const match = markdown.match(/^##\s+(?:in-)?game description\s*\n([\s\S]*?)(?=^#{1,2}\s|(?![\s\S]))/im);
  return match ? match[1] : '';
}

function buildArticle(page) {
  const templates = topTemplates(cleanSource(page.content));
  const infobox = templates.find(template => SCOPE_KEYS.has(template.key));
  const fields = {};
  Object.entries(infobox?.named || {}).forEach(([key, value]) => {
    const text = plainText(value);
    if (text) fields[key] = text;
  });
  if (page.kind === 'technology' && /^provides \d+ slots/i.test(fields.type || '')) return { excluded: 'player-found multi-tool' };

  const version = templates.find(template => template.key === 'version')?.positional[0]?.trim() || '';
  const obsolete = templates.some(template => template.key === 'obsolete') || ARCHIVED_VARIANT.test(page.title);
  const recipes = templates.flatMap(template => parseRecipes(template, page.title));
  const value = Number(String(fields.value || '').replace(/,/g, ''));

  const facts = Object.entries(fields)
    .filter(([key]) => !HIDDEN_FIELDS.has(key))
    .map(([key, text]) => `- **${FACT_LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}:** ${text}`);
  const prose = renderWikitext(page.content, { title: page.title });
  const body = [`# ${page.title}`, facts.length ? `## Quick Facts\n\n${facts.join('\n')}` : '', prose].filter(Boolean).join('\n\n');
  const category = categoryFor(page.kind, fields);

  return {
    category,
    meta: {
      title: page.title,
      category,
      kind: page.kind,
      summary: summarize(gameDescription(prose)) || fields.desc || summarize(prose),
      pageId: page.pageId,
      revId: page.revId,
      revTimestamp: page.revTimestamp,
      version,
      obsolete,
      status: 'current',
      source: `${WIKI_BASE}/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      license: LICENSE,
      data: { fields, ...(fields.value && Number.isFinite(value) && { value }), recipes }
    },
    body: `${body}\n`
  };
}

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
