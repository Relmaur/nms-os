// Wiki Codex search engine and labels (pure, no DOM). The data loading half lives in apps/web/src/app/wiki-data.js.
import { escapeHtml } from './util.ts';

export { slugify } from './slug.ts';

// One Codex entry: from wiki/index.json (header search) or the offline bundle (with `body`), or a local draft.
export interface Entry {
  title: string;
  category: string;
  path?: string;
  summary?: string;
  source?: string;
  body?: string;
  obsolete?: boolean;
  removed?: boolean;
  [key: string]: unknown;
}
// An entry with the lower-cased fields search() scores against.
export interface PreparedEntry extends Entry {
  _title: string;
  _summary: string;
  _headings: string;
  _text: string;
  _body: string;
  _letter: string;
}
export interface SearchResult {
  entry: PreparedEntry;
  score: number;
  field: string;
}
export interface SearchOptions {
  category?: string;
  source?: string;
  letter?: string;
  includeOld?: boolean;
}

// Folders under wiki/ (the wiki sync, packages/wiki, decides which page goes where from its infobox).
export const CATEGORIES: Record<string, { label: string; icon: string; blurb: string }> = {
  resources: { label: 'Resources', icon: 'ph-atom', blurb: 'Elements, gases and minerals' },
  products: { label: 'Products', icon: 'ph-package', blurb: 'Components, tradeables, curiosities' },
  cooking: { label: 'Cooking', icon: 'ph-cooking-pot', blurb: 'Edible products and raw ingredients' },
  fish: { label: 'Fish', icon: 'ph-fish', blurb: 'Every catch, by rarity' },
  building: { label: 'Building', icon: 'ph-house-line', blurb: 'Base, freighter and corvette parts' },
  technology: { label: 'Technology', icon: 'ph-cpu', blurb: 'Exosuit, starship, Multi-Tool, exocraft tech' },
  places: { label: 'Places', icon: 'ph-map-pin', blurb: 'Points of interest and space encounters' },
  missions: { label: 'Missions', icon: 'ph-flag-banner', blurb: 'Missions and journey milestones' },
  galaxies: { label: 'Galaxies', icon: 'ph-shooting-star', blurb: 'All 256 galaxies' },
  updates: { label: 'Updates', icon: 'ph-newspaper', blurb: 'Every patch, with its notes' },
  mechanics: { label: 'Mechanics', icon: 'ph-gear-six', blurb: 'How the game works: ships, tools, terminals, rules' },
  world: { label: 'Life and worlds', icon: 'ph-paw-print', blurb: 'Creature genera, flora, minerals, biomes' },
  lore: { label: 'Lore', icon: 'ph-scroll', blurb: 'The story, the races, guilds and Sentinels' }
};
const CUSTOM_SOURCE = {
  label: 'Custom',
  badge: 'custom',
  classes: 'text-purple-300 bg-purple-500/10 border-purple-500/30'
};
export const SOURCES: Record<string, { label: string; badge: string; classes: string }> = {
  custom: CUSTOM_SOURCE,
  draft: { label: 'Draft', badge: 'draft', classes: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
  wiki: { label: 'Wiki page', badge: 'wiki', classes: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' }
};
export function plainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\|?\s*:?-{3,}.*$/gm, '')
    .replace(/\[\[(?:[^\]|]*?\\?\|)?([^\]]+)\]\]/g, '$1')
    .replace(/[*_`>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function prepare(entry: Entry): PreparedEntry {
  const text = entry.body ? plainText(entry.body.replace(/^\s*#\s+[^\n]*\n*/, '')) : '';
  const headings = entry.body ? (entry.body.match(/^#{2,4}\s+.+$/gm) || []).join(' ').toLowerCase() : '';
  return {
    ...entry,
    _title: entry.title.toLowerCase(),
    _summary: (entry.summary ?? '').toLowerCase(),
    _headings: headings,
    _text: text,
    _body: text.toLowerCase(),
    _letter: (entry.title.replace(/^[^a-z0-9]+/i, '')[0] || '#').toUpperCase().replace(/[^A-Z]/, '#')
  };
}

export function tokenize(query: unknown): string[] {
  return String(query)
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
}

// "doughnuts" should still find "Doughnut".
function variants(token: string): string[] {
  const out = [token];
  if (token.length > 4 && token.endsWith('es')) out.push(token.slice(0, -2));
  if (token.length > 3 && token.endsWith('s')) out.push(token.slice(0, -1));
  return out;
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

function startsWord(text: string, token: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text);
}

// Every token must match somewhere; title > summary > headings > body > loose title subsequence.
function score(entry: PreparedEntry, tokens: string[], phrase: string): { score: number; field: string } | null {
  let total = 0;
  let field = 'title';
  for (const token of tokens) {
    let best = 0;
    let bestField = '';
    for (const t of variants(token)) {
      const hits: [boolean, number, string][] = [
        [entry._title === t, 12, 'title'],
        [entry._title.startsWith(t), 8, 'title'],
        [startsWord(entry._title, t), 6, 'title'],
        [entry._title.includes(t), 5, 'title'],
        [entry._summary.includes(t), 3, 'summary'],
        [entry._headings.includes(t), 2.5, 'text'],
        [entry._body.includes(t), 1.5, 'text'],
        [t.length >= 3 && isSubsequence(t, entry._title), 0.5, 'title']
      ];
      const match = hits.find(([ok]) => ok);
      if (match && match[1] > best) [, best, bestField] = match;
    }
    if (!best) return null;
    total += best;
    if (bestField !== 'title') field = bestField;
  }
  if (phrase && tokens.length > 1 && entry._title.includes(phrase)) total += 6;
  return { score: total, field };
}

// Pages for items no longer in the game, or removed from the wiki, only appear when asked for.
export const isOld = (entry: Pick<Entry, 'obsolete' | 'removed'>): boolean => Boolean(entry.obsolete || entry.removed);

export function search(
  entries: PreparedEntry[],
  query: unknown,
  { category = 'all', source = 'all', letter = '', includeOld = false }: SearchOptions = {}
): SearchResult[] {
  const tokens = tokenize(query);
  const phrase = tokens.join(' ');
  const pool = entries.filter(
    entry =>
      (includeOld || !isOld(entry)) &&
      (category === 'all' || entry.category === category) &&
      (source === 'all' || entry.source === source || (source === 'custom' && entry.source === 'draft')) &&
      (!letter || entry._letter === letter)
  );
  if (!tokens.length) {
    return pool
      .map(entry => ({ entry, score: 0, field: 'title' }))
      .sort((a, b) => a.entry._title.localeCompare(b.entry._title));
  }
  return pool
    .flatMap(entry => {
      const result = score(entry, tokens, phrase);
      return result?.score ? [{ entry, ...result }] : [];
    })
    .sort((a, b) => b.score - a.score || a.entry._title.localeCompare(b.entry._title));
}

export function highlight(text: unknown, tokens: string[]): string {
  const escaped = escapeHtml(text);
  const pattern = tokens
    .flatMap(variants)
    .sort((a, b) => b.length - a.length)
    .map(token => escapeHtml(token).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return pattern ? escaped.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>') : escaped;
}

// Context around the first body match, or the summary when the match is in the title.
export function snippet(entry: Pick<PreparedEntry, '_text' | 'summary'>, tokens: string[], radius = 90): string {
  const text = entry._text || entry.summary || '';
  const lower = text.toLowerCase();
  let at = -1;
  let len = 0;
  for (const t of tokens.flatMap(variants)) {
    const i = lower.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) [at, len] = [i, t.length];
  }
  if (at === -1) return entry.summary || text.slice(0, radius * 2);
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + len + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

export function badge(source: string): string {
  const meta = SOURCES[source] ?? CUSTOM_SOURCE;
  return `<span class="px-1.5 py-0.5 rounded border text-[10px] font-mono leading-none ${meta.classes}">${meta.badge}</span>`;
}

export function statusBadge(entry: Pick<Entry, 'obsolete' | 'removed'>): string {
  if (entry.removed)
    return '<span class="px-1.5 py-0.5 rounded border text-[10px] font-mono leading-none text-rose-300 bg-rose-500/10 border-rose-500/30">removed</span>';
  if (entry.obsolete)
    return '<span class="px-1.5 py-0.5 rounded border text-[10px] font-mono leading-none text-slate-300 bg-slate-500/10 border-slate-500/40">obsolete</span>';
  return '';
}
