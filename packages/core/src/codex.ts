// The Codex page's logic (pure, no DOM): hash routes, browse filters and their counts, and an article's relations
// (what it's used in, what it links to, where it's mentioned, its neighbours). Search itself is search.ts.
import { CATEGORIES, SOURCES, isOld, search, type PreparedEntry, type SearchResult } from './search.ts';

export const PAGE_SIZE = 20;
export const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]; // ASCII only, so splitting is safe

export interface BrowseParams {
  q: string;
  cat: string;
  src: string;
  letter: string;
  sort: 'relevance' | 'az';
  old: '0' | '1';
  page: number;
}
export const DEFAULTS: BrowseParams = {
  q: '',
  cat: 'all',
  src: 'all',
  letter: '',
  sort: 'relevance',
  old: '0',
  page: 1
};

export type Route = { view: 'browse'; params: BrowseParams } | { view: 'article'; path: string; params: BrowseParams };

// `#/?q=…&cat=…` (browse) and `#/a/<path>?q=…` (an article, remembering the search it came from).
export function parseRoute(hash: string): Route {
  const [route = '/', query = ''] = (hash.replace(/^#/, '') || '/').split('?');
  const search = new URLSearchParams(query);
  const get = (key: keyof BrowseParams) => search.get(key) ?? String(DEFAULTS[key]);
  const params: BrowseParams = {
    q: get('q'),
    cat: Object.hasOwn(CATEGORIES, get('cat')) ? get('cat') : 'all',
    src: Object.hasOwn(SOURCES, get('src')) && get('src') !== 'draft' ? get('src') : 'all',
    letter: LETTERS.includes(get('letter')) ? get('letter') : '',
    sort: get('sort') === 'az' ? 'az' : 'relevance',
    old: get('old') === '1' ? '1' : '0',
    page: Math.max(1, Number.parseInt(get('page'), 10) || 1)
  };
  if (!route.startsWith('/a/')) return { view: 'browse', params };
  let path = route.slice(3);
  try {
    path = decodeURIComponent(path);
  } catch {
    // a malformed escape: look the raw path up, which shows "Article not found"
  }
  return { view: 'article', path, params };
}

export function browseHref(params: Partial<BrowseParams>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...DEFAULTS, ...params }))
    if (String(value) !== String(DEFAULTS[key as keyof BrowseParams])) search.set(key, String(value));
  const qs = search.toString();
  return `#/${qs ? `?${qs}` : ''}`;
}

export const articleHref = (path: string, q = ''): string =>
  `#/a/${encodeURIComponent(path)}${q ? `?q=${encodeURIComponent(q)}` : ''}`;

export const isLanding = (params: BrowseParams): boolean =>
  !params.q && params.cat === 'all' && params.src === 'all' && !params.letter && params.old === '0';

const tally = (results: SearchResult[], key: 'category' | 'source') =>
  results.reduce<Record<string, number>>((acc, result) => {
    const value = result.entry[key] ?? '';
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

export interface Browse {
  results: SearchResult[]; // every match after the filters, sorted
  page: number; // clamped to the pages there are
  pages: number;
  catCounts: Record<string, number>; // each category's count under the other filters
  catTotal: number;
  srcCounts: Record<string, number>; // drafts count as "Your articles" (custom)
  srcTotal: number;
  letters: Set<string>; // letters that have matches under the other filters
  oldCount: number; // matches that are no longer in the game
}

// Each facet counts what choosing it would show, given every other filter (the usual faceted-search rule).
export function browse(entries: PreparedEntry[], params: BrowseParams): Browse {
  const includeOld = params.old === '1';
  const base = search(entries, params.q, { includeOld });
  const srcMatch = (r: SearchResult) =>
    params.src === 'all' || r.entry.source === params.src || (params.src === 'custom' && r.entry.source === 'draft');
  const catMatch = (r: SearchResult) => params.cat === 'all' || r.entry.category === params.cat;
  const letterMatch = (r: SearchResult) => !params.letter || r.entry._letter === params.letter;

  const forCats = base.filter(r => srcMatch(r) && letterMatch(r));
  const srcCounts = tally(
    base.filter(r => catMatch(r) && letterMatch(r)),
    'source'
  );
  srcCounts.custom = (srcCounts.custom ?? 0) + (srcCounts.draft ?? 0);
  let results = base.filter(r => srcMatch(r) && catMatch(r) && letterMatch(r));
  if (params.sort === 'az' && params.q)
    results = [...results].sort((a, b) => a.entry._title.localeCompare(b.entry._title));
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  return {
    results,
    page: Math.min(params.page, pages),
    pages,
    catCounts: tally(forCats, 'category'),
    catTotal: forCats.length,
    srcCounts,
    srcTotal: Object.entries(srcCounts)
      .filter(([key]) => key !== 'draft')
      .reduce((sum, [, n]) => sum + n, 0),
    letters: new Set(base.filter(r => srcMatch(r) && catMatch(r)).map(r => r.entry._letter)),
    oldCount: (includeOld ? base : search(entries, params.q, { includeOld: true })).filter(
      r => isOld(r.entry) && srcMatch(r) && catMatch(r) && letterMatch(r)
    ).length
  };
}

export const pageOf = (view: Browse): SearchResult[] =>
  view.results.slice((view.page - 1) * PAGE_SIZE, view.page * PAGE_SIZE);

// [[Target]], [[Target|label]], and [[Target\|label]] inside Markdown table cells.
export const WIKI_LINK = /\[\[([^\]]+?)\]\]/g;
export function splitLink(inner: string): { target: string; label: string } {
  const [target = '', ...label] = inner.split(/\\?\|/);
  return { target: target.trim(), label: (label.join('|') || target).trim() };
}

interface Recipe {
  type?: unknown;
  obsolete?: unknown;
  inputs?: { name?: unknown }[];
}

export interface CodexIndex {
  entries: PreparedEntry[];
  byPath: Map<string, PreparedEntry>;
  find: (title: string) => PreparedEntry | undefined; // by title or an alias the wiki redirects, current pages first
  usedIn: Map<string, PreparedEntry[]>; // lower-case ingredient -> entries whose recipes use it
}

export function makeIndex(entries: PreparedEntry[], aliases: Record<string, string>): CodexIndex {
  const byPath = new Map(entries.map(entry => [String(entry.path), entry]));
  const byTitle = new Map<string, PreparedEntry>();
  for (const entry of [...entries].sort((a, b) => Number(isOld(a)) - Number(isOld(b))))
    if (!byTitle.has(entry._title)) byTitle.set(entry._title, entry);
  const aliasMap = new Map(Object.entries(aliases).map(([from, to]) => [from.toLowerCase(), to.toLowerCase()]));
  const find = (title: string) => {
    const lower = title.trim().toLowerCase();
    const alias = aliasMap.get(lower);
    return byTitle.get(lower) ?? (alias ? byTitle.get(alias) : undefined);
  };
  // Recipe inputs -> the items they go into (crafting, refining, cooking).
  const usedIn = new Map<string, PreparedEntry[]>();
  for (const entry of entries) {
    const recipes = Array.isArray(entry.recipes) ? (entry.recipes as Recipe[]) : [];
    for (const recipe of recipes) {
      if (!['craft', 'refine', 'cook'].includes(String(recipe.type)) || recipe.obsolete) continue;
      for (const input of recipe.inputs ?? []) {
        const name = String(input.name);
        const key = find(name)?._title ?? name.toLowerCase();
        const list = usedIn.get(key) ?? [];
        if (!list.includes(entry)) list.push(entry);
        usedIn.set(key, list);
      }
    }
  }
  return { entries, byPath, find, usedIn };
}

export interface Relations {
  usedIn: PreparedEntry[];
  linksTo: PreparedEntry[];
  mentionedIn: PreparedEntry[]; // at most 8: a plain-text match, so long lists are mostly noise
  nearby: PreparedEntry[]; // up to 5 neighbours in the same category, alphabetically
}

const byTitleOrder = (a: PreparedEntry, b: PreparedEntry) => a._title.localeCompare(b._title);

export function relations(index: CodexIndex, entry: PreparedEntry): Relations {
  const current = (other: PreparedEntry) => other !== entry && !isOld(other);
  const linksTo = [
    ...new Set([...(entry.body ?? '').matchAll(WIKI_LINK)].map(match => splitLink(match[1] ?? '').target.toLowerCase()))
  ]
    .map(index.find)
    .filter((other): other is PreparedEntry => other !== undefined && current(other))
    .filter((other, i, list) => list.indexOf(other) === i);
  const mentionedIn =
    entry._title.length >= 4
      ? index.entries
          .filter(other => current(other) && other._title !== entry._title && other._body.includes(entry._title))
          .sort(byTitleOrder)
          .slice(0, 8)
      : [];
  const siblings = index.entries
    .filter(other => other.category === entry.category && (other === entry || !isOld(other)))
    .sort(byTitleOrder);
  const at = siblings.indexOf(entry);
  return {
    usedIn: (index.usedIn.get(entry._title) ?? []).filter(current).sort(byTitleOrder),
    linksTo,
    mentionedIn,
    nearby: siblings
      .slice(Math.max(0, at - 2), at + 4)
      .filter(other => other !== entry)
      .slice(0, 5)
  };
}

// Heading ids for the table of contents: stable slugs, made unique in page order.
export function headingIds(texts: string[]): string[] {
  const used = new Set<string>();
  return texts.map(text => {
    let id = `h-${text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;
    while (used.has(id)) id += '-x';
    used.add(id);
    return id;
  });
}
