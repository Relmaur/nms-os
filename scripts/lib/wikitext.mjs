// Wikitext → Markdown + structured data for the wiki mirror (pure: no network, no file system).
// Used by scripts/sync-wiki.mjs and covered by tests/unit/wikitext.test.mjs.

export const WIKI_BASE = 'https://nomanssky.fandom.com';
export const LICENSE = "CC BY-SA 3.0 (No Man's Sky Wiki contributors)";

// Infobox template -> kind, in priority order (a page's kind is the first of these it embeds).
export const SCOPE = {
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
export const SCOPE_KEYS = new Set(Object.keys(SCOPE).map(name => name.toLowerCase()));
export const FOLDERS = [
  'resources',
  'products',
  'cooking',
  'fish',
  'building',
  'technology',
  'places',
  'missions',
  'galaxies',
  'updates'
];

// Pages the wiki keeps for an older version of the game, e.g. "Blaze Javelin (Atlas)".
export const ARCHIVED_VARIANT =
  /\((Release|Foundation|Pathfinder|Atlas|Atlas Rises|NEXT|Abyss|Visions|Beyond|Synthesis|Living Ship|ExoMech|Desolation|Origins|Frontiers|Prisms|Expeditions|Waypoint|Interceptor|Fractal|Singularity|Echoes|Orbital|Worlds Part I+)\)$/i;

// Must match WikiSearch.slugify() in assets/lib/search.js.
export function slugify(title) {
  return title
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

// ---------------------------------------------------------------------------
// Frontmatter (strings and objects are JSON, which is valid YAML)
// ---------------------------------------------------------------------------
export function toFrontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `${key}: ${typeof value === 'number' || typeof value === 'boolean' ? value : JSON.stringify(typeof value === 'object' ? value : String(value))}`
    );
  return `---\n${lines.join('\n')}\n---\n\n`;
}

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^["{[]/.test(value)) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1);
      }
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
export function closeBraces(text, start) {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') {
      depth++;
      i++;
    } else if (text[i] === '}' && text[i + 1] === '}') {
      depth--;
      i++;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

// Split on a separator that is not inside {{templates}} or [[links]].
export function splitTop(text, sep = '|') {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const two = text.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      depth++;
      current += two;
      i++;
      continue;
    }
    if ((two === '}}' || two === ']]') && depth > 0) {
      depth--;
      current += two;
      i++;
      continue;
    }
    if (text[i] === sep && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += text[i];
  }
  parts.push(current);
  return parts;
}

export function parseTemplate(inner) {
  const [rawName, ...rest] = splitTop(inner);
  const name = rawName
    .trim()
    .replace(/_/g, ' ')
    .replace(/^template:/i, '');
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
export function mapTemplates(text, render) {
  let out = '';
  let i = 0;
  while (true) {
    const start = text.indexOf('{{', i);
    if (start === -1) {
      out += text.slice(i);
      break;
    }
    const end = closeBraces(text, start);
    if (end === -1) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, start) + render(parseTemplate(text.slice(start + 2, end - 2)));
    i = end;
  }
  return out;
}

export function topTemplates(text) {
  const found = [];
  mapTemplates(text, template => {
    found.push(template);
    return '';
  });
  return found;
}

export const ENTITIES = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  ndash: '–',
  mdash: '—',
  rarr: '→',
  larr: '←',
  times: '×',
  hellip: '…',
  deg: '°'
};
export function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

// Inline templates that stand for a word or a link; everything else (navboxes, queries, banners,
// layout helpers) renders as nothing.
export const INLINE = {
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
export function parseIngredients(spec) {
  return spec
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const at = item.lastIndexOf(',');
      const qty = Number(item.slice(at + 1).trim());
      return { name: plainText(item.slice(0, at)), qty: Number.isFinite(qty) ? qty : item.slice(at + 1).trim() };
    });
}

export function parseProcess(spec, type, title) {
  const pieces = spec
    .split(';')
    .map(piece => piece.trim())
    .filter(Boolean);
  const inputs = parseIngredients(pieces.filter(piece => piece.includes(',')).join(';'));
  const [outQty, timing = ''] = pieces.filter(piece => !piece.includes(','));
  const [time, ...label] = timing.split('%');
  return {
    type,
    inputs,
    outputs: [{ name: title, qty: Number(outQty) || 1 }],
    ...(time && { seconds: Number(time) }),
    ...(label.length && label.join('%').trim() && { label: label.join('%').trim() })
  };
}

export function parseRecipes(template, title) {
  const specs = template.positional.filter(Boolean);
  switch (template.key) {
    case 'craft': // "Name,qty;Name,qty" with an optional ";outputQty"
      return specs.map(spec => {
        const pieces = spec
          .split(';')
          .map(piece => piece.trim())
          .filter(Boolean);
        const outQty = Number(pieces.find(piece => !piece.includes(','))) || 1;
        return {
          type: 'craft',
          inputs: parseIngredients(pieces.filter(piece => piece.includes(',')).join(';')),
          outputs: [{ name: title, qty: outQty }],
          ...(template.named.blueprint === 'yes' && { blueprint: true })
        };
      });
    case 'craftobsolete': {
      const inputs = [];
      for (let i = 0; i + 1 < specs.length; i += 2)
        inputs.push({ name: plainText(specs[i]), qty: Number(specs[i + 1]) || specs[i + 1] });
      return inputs.length ? [{ type: 'craft', obsolete: true, inputs, outputs: [{ name: title, qty: 1 }] }] : [];
    }
    case 'poc-refine':
      return specs.map(spec => parseProcess(spec, 'refine', title));
    case 'cook':
      return specs.map(spec => parseProcess(spec, 'cook', title));
    case 'cookobsolete':
      return specs.map(spec => ({ ...parseProcess(spec, 'cook', title), obsolete: true }));
    case 'poc-repair':
      return specs.map(spec => ({ type: 'repair', inputs: parseIngredients(spec), outputs: [] }));
    case 'poc-dismantle':
      return specs.map(spec => ({
        type: 'dismantle',
        inputs: [{ name: title, qty: 1 }],
        outputs: parseIngredients(spec)
      }));
    default:
      return [];
  }
}

export const RECIPE_LABELS = {
  craft: 'Crafting',
  refine: 'Refiner',
  cook: 'Nutrient Processor',
  repair: 'Repair',
  dismantle: 'Dismantle'
};
export function recipeLine(recipe) {
  const list = items => items.map(item => `${item.qty} × [[${item.name}]]`).join(' + ');
  const head = [
    `**${RECIPE_LABELS[recipe.type]}${recipe.obsolete ? ' (obsolete)' : ''}**`,
    recipe.label && `*${recipe.label}*`,
    recipe.seconds !== undefined && `${recipe.seconds} s per unit`,
    recipe.blueprint && 'needs the blueprint'
  ]
    .filter(Boolean)
    .join(' · ');
  if (recipe.type === 'repair') return `- ${head}: ${list(recipe.inputs)}`;
  if (recipe.type === 'dismantle') return `- ${head} returns: ${list(recipe.outputs)}`;
  return `- ${head}: ${list(recipe.inputs)} → ${recipe.outputs.map(item => `${item.qty} × ${item.name}`).join(' + ')}`;
}

export function expandTemplates(text, ctx) {
  return mapTemplates(text, template => {
    if (SCOPE_KEYS.has(template.key)) return '';
    const recipes = parseRecipes(template, ctx.title);
    if (recipes.length) return `\n\n${recipes.map(recipeLine).join('\n')}\n\n`;
    const inline = INLINE[template.key];
    return inline ? expandTemplates(inline(template, ctx), ctx) : '';
  });
}

// [[File:…|caption with [[links]]]] needs bracket matching, not a regex.
export function removeBracketed(text, prefix) {
  let out = '';
  let i = 0;
  while (true) {
    const found = text.slice(i).search(prefix);
    if (found === -1) {
      out += text.slice(i);
      break;
    }
    const at = i + found;
    let depth = 0;
    let j = at;
    for (; j < text.length - 1; j++) {
      if (text[j] === '[' && text[j + 1] === '[') {
        depth++;
        j++;
      } else if (text[j] === ']' && text[j + 1] === ']') {
        depth--;
        j++;
        if (depth === 0) break;
      }
    }
    out += text.slice(i, at);
    i = j + 1;
  }
  return out;
}

export function convertLinks(text) {
  return removeBracketed(text, /\[\[\s*:?(File|Image|Media|Category|[a-z]{2}(-[a-z]+)?):/i)
    .replace(/\[\[([^\]|]+?)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]([a-z]*)/g, (_, target, label, suffix) => {
      target = target.trim().replace(/_/g, ' ');
      const shown = `${label ?? target}${suffix}`.trim();
      return shown === target ? `[[${target}]]` : `[[${target}|${shown}]]`;
    })
    .replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, '[$2]($1)')
    .replace(/\[(https?:\/\/[^\s\]]+)\]/g, '<$1>');
}

export function convertInline(text) {
  return text
    .replace(/('{2,5})[ \t]*\n/g, '$1') // bold/italic opened at a line end
    .replace(/'''''(.+?)'''''/g, '***$1***')
    .replace(/'''(.+?)'''/g, '**$1**')
    .replace(/''(.+?)''/g, '*$1*')
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(
      /<\/?(span|div|small|big|center|font|u|s|abbr|p|sub|sup|nowiki|onlyinclude|includeonly|noinclude|poem|mark|b|i)\b[^>]*>/gi,
      ''
    );
}

// MediaWiki tables -> Markdown tables; multi-line cells are joined with <br>.
// Innermost tables first, so a table nested in a cell doesn't leave its parent's "|}" behind.
export function convertTables(text) {
  const innermost = /^[ \t]*\{\|[^\n]*\n((?:(?!^[ \t]*\{\|)[\s\S])*?)^[ \t]*\|\}[^\n]*$/m;
  while (innermost.test(text)) text = text.replace(innermost, (_, inner) => tableToMarkdown(inner));
  return text;
}

export function tableToMarkdown(inner) {
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
    if (trimmed.startsWith('|-')) {
      row = null;
      continue;
    }
    if (trimmed.startsWith('!') || trimmed.startsWith('|')) {
      const isHeader = trimmed.startsWith('!');
      if (!row) {
        row = [];
        rows.push(row);
        if (rows.length === 1) headerRow = isHeader;
      }
      trimmed
        .slice(1)
        .split(isHeader ? /!!|\|\|/ : /\|\|/)
        .forEach(cell => row.push([cellText(cell)]));
    } else if (row?.length && trimmed) {
      row[row.length - 1].push(trimmed.replace(/^(?:[-*#]|1\.)\s+/, '• '));
    }
  }
  if (!rows.length) return '';
  const width = Math.max(...rows.map(r => r.length));
  const cell = lines =>
    lines
      .filter(Boolean)
      .join('<br>')
      .replace(/\[\[([^\]]*)\]\]/g, m => m.replace(/\|/g, '\\|'))
      .replace(/\n/g, ' ') || ' ';
  const md = rows.map(r => `| ${Array.from({ length: width }, (_, i) => cell(r[i] || [])).join(' | ')} |`);
  if (!headerRow) md.unshift(`| ${Array(width).fill(' ').join(' | ')} |`);
  md.splice(1, 0, `|${Array(width).fill(' --- ').join('|')}|`);
  return `\n${md.join('\n')}\n`;
}

export function convertBlocks(text) {
  return text
    .split('\n')
    .map(line => {
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
    })
    .join('\n');
}

// A heading followed only by headings of the same or a higher level (or nothing) has no content.
export function dropEmptyHeadings(markdown) {
  const lines = markdown.split('\n');
  const level = line => line.match(/^(#{1,6}) /)?.[1].length || 0;
  return lines
    .filter((line, i) => {
      const own = level(line);
      if (!own) return true;
      const next = lines.slice(i + 1).find(other => other.trim());
      return next !== undefined && (level(next) === 0 || level(next) > own);
    })
    .join('\n');
}

export function cleanSource(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>/]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<references\s*\/?>/gi, '')
    .replace(/<gallery[^>]*>[\s\S]*?<\/gallery>/gi, '')
    .replace(/<\/?tabber[^>]*>/gi, '')
    .replace(/__[A-Z]+__/g, '');
}

export function renderWikitext(text, ctx) {
  let md = cleanSource(text);
  md = expandTemplates(md, ctx);
  md = convertLinks(md);
  md = convertBlocks(md); // before bold/italic, whose "**" would read as a list marker
  md = convertInline(md);
  md = convertTables(md);
  md = decodeEntities(md)
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
  return dropEmptyHeadings(md)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Plain text for infobox values and ingredient names.
export function plainText(text) {
  let out = cleanSource(String(text));
  out = mapTemplates(out, template => {
    const inline = INLINE[template.key];
    return inline ? plainText(inline(template, { title: '' })) : '';
  });
  out = convertLinks(out)
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  out = out
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '');
  return decodeEntities(out).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Page -> article
// ---------------------------------------------------------------------------
export const FACT_LABELS = {
  category: 'Category',
  subcategory: 'Subcategory',
  type: 'Type',
  rarity: 'Rarity',
  value: 'Value',
  symbol: 'Symbol',
  used: 'Used for',
  complexity: 'Base complexity',
  power: 'Power',
  level: 'Level',
  stats: 'Stats',
  recharge: 'Recharge',
  release: 'Added in',
  desc: 'Description',
  subtype: 'Subtype',
  order: 'Galaxy number',
  date: 'Release date',
  platform: 'Platforms',
  rewards: 'Rewards',
  frequency: 'Frequency',
  interaction: 'Interaction',
  system_types: 'System types',
  requires: 'Requires',
  series: 'Series',
  origin: 'Given by',
  implemented: 'Added in',
  prevmission: 'Previous mission',
  nextmission: 'Next mission',
  previous: 'Previous',
  next: 'Next'
};
export const HIDDEN_FIELDS = new Set([
  'image',
  'name',
  'color',
  'upgradeicon',
  'link',
  'alert_1',
  'alert_2',
  'ramifications',
  'notes',
  'datexbox',
  'dateps',
  'dateswitch',
  'datepc',
  'datemac',
  'steam',
  'gog',
  'platforms',
  'build'
]);

export function categoryFor(kind, fields) {
  switch (kind) {
    case 'resource':
      return 'resources';
    case 'technology':
      return 'technology';
    case 'place':
    case 'encounter':
      return 'places';
    case 'mission':
    case 'milestone':
      return 'missions';
    case 'galaxy':
      return 'galaxies';
    case 'update':
      return 'updates';
  }
  const category = (fields.category || '').toLowerCase();
  const type = (fields.type || '').toLowerCase();
  if (category === 'fish' || type.endsWith('fish')) return 'fish';
  if (type === 'edible product' || type === 'raw ingredient') return 'cooking';
  if (/building|customisation|adornment|exhaust|container/.test(category) || /construction|decoration/.test(type))
    return 'building';
  return 'products';
}

export function summarize(markdown) {
  const paragraph = markdown
    .split(/\n{2,}/)
    .map(block => block.trim())
    .find(block => block && !/^(#|\||-|>|\*\*[^*]+:\*\*)/.test(block) && block.length > 20);
  const text = (paragraph || '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/<br>/g, ' ')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text;
}

// The in-game text, when the page quotes it, makes the best summary.
export function gameDescription(markdown) {
  const match = markdown.match(/^##\s+(?:in-)?game description\s*\n([\s\S]*?)(?=^#{1,2}\s|(?![\s\S]))/im);
  return match ? match[1] : '';
}

export function buildArticle(page) {
  const templates = topTemplates(cleanSource(page.content));
  const infobox = templates.find(template => SCOPE_KEYS.has(template.key));
  const fields = {};
  Object.entries(infobox?.named || {}).forEach(([key, value]) => {
    const text = plainText(value);
    if (text) fields[key] = text;
  });
  if (page.kind === 'technology' && /^provides \d+ slots/i.test(fields.type || ''))
    return { excluded: 'player-found multi-tool' };

  const version = templates.find(template => template.key === 'version')?.positional[0]?.trim() || '';
  const obsolete = templates.some(template => template.key === 'obsolete') || ARCHIVED_VARIANT.test(page.title);
  const recipes = templates.flatMap(template => parseRecipes(template, page.title));
  const value = Number(String(fields.value || '').replace(/,/g, ''));

  const facts = Object.entries(fields)
    .filter(([key]) => !HIDDEN_FIELDS.has(key))
    .map(
      ([key, text]) =>
        `- **${FACT_LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}:** ${text}`
    );
  const prose = renderWikitext(page.content, { title: page.title });
  const body = [`# ${page.title}`, facts.length ? `## Quick Facts\n\n${facts.join('\n')}` : '', prose]
    .filter(Boolean)
    .join('\n\n');
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
