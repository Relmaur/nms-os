// Reads a MediaWiki XML database dump of the No Man's Sky wiki: the mirror's only source. Fandom asked that tools use
// its dumps (Special:Statistics) rather than the API, so every refresh is `pnpm sync:wiki --from-dump <file>`, run by
// hand when a new dump is out (ADR-0009).
//
// A dump holds the whole wiki, community pages included, so it never enters the repo, and it is streamed page by
// page: only the pages in scope and the redirects stay in memory.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { z } from 'zod';
import { MECHANICS, SCOPE, WIKI_BASE, cleanSource, topTemplates, type Page } from './wikitext.ts';

export class InvalidDump extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDump';
  }
}

export interface DumpPage {
  pageId: number;
  title: string;
  ns: number;
  /** The redirect's target title, or null for an ordinary page. */
  redirect: string | null;
  revId: number;
  revTimestamp: string;
  content: string;
}

const IsoDate = z.string().refine(value => !Number.isNaN(Date.parse(value)));
const DumpPageSchema = z.object({
  pageId: z.coerce.number().int().positive(),
  title: z.string().min(1),
  ns: z.coerce.number().int(),
  redirect: z.string().nullable(),
  revId: z.coerce.number().int().positive(),
  revTimestamp: IsoDate,
  content: z.string()
});

// XML's five entities and numeric references. Wikitext's own entities (&nbsp; in the text) are left for the renderer.
export function decodeXml(text: string): string {
  return text.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (match, name: string) => {
    if (name[0] === '#')
      return String.fromCodePoint(name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
    return { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[name.toLowerCase()] ?? match;
  });
}

const inner = (xml: string, tag: string): string | null => {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? (match[1] ?? '') : null;
};

/**
 * One `<page>…</page>` element. A dump with full history has several revisions per page: the last one is the
 * current text. A revision whose text was hidden by the wiki's admins has no text and is read as empty.
 */
export function parsePage(xml: string): DumpPage {
  const revisionAt = xml.lastIndexOf('<revision>');
  const head = revisionAt === -1 ? xml : xml.slice(0, xml.indexOf('<revision>'));
  const revision = revisionAt === -1 ? '' : xml.slice(revisionAt);
  const redirect = /<redirect\s+title="([^"]*)"\s*\/>/.exec(head)?.[1];
  const text = /<text\b[^>]*\/>/.test(revision) ? '' : (inner(revision, 'text') ?? '');
  const parsed = DumpPageSchema.safeParse({
    pageId: inner(head, 'id'),
    title: decodeXml(inner(head, 'title') ?? ''),
    ns: inner(head, 'ns'),
    redirect: redirect === undefined ? null : decodeXml(redirect),
    revId: inner(revision.replace(/<contributor>[\s\S]*?<\/contributor>/, ''), 'id'),
    revTimestamp: inner(revision, 'timestamp'),
    content: decodeXml(text)
  });
  if (!parsed.success) {
    const where = inner(head, 'title') ?? 'a page with no title';
    throw new InvalidDump(`${where}: ${parsed.error.issues[0]?.path.join('.') ?? '?'} is missing or invalid`);
  }
  return parsed.data;
}

// The dump's own address for the wiki (<siteinfo><base>): a dump of another wiki is refused before anything is read.
function checkSite(siteinfo: string): void {
  const base = inner(siteinfo, 'base') ?? '';
  if (!base.startsWith(`${WIKI_BASE}/`))
    throw new InvalidDump(`this is a dump of ${base || 'an unknown wiki'}, not ${WIKI_BASE}`);
}

/** Every page in the dump, in file order. Plain `.xml` or gzipped `.xml.gz`; a `.7z` must be extracted first. */
export async function* readDump(file: string): AsyncGenerator<DumpPage> {
  if (/\.(7z|bz2|zip)$/i.test(file))
    throw new InvalidDump(`${file} is compressed in a format Node can't read: extract the .xml first (7z x <file>)`);
  const raw = fs.createReadStream(file);
  const source = file.endsWith('.gz') ? raw.pipe(zlib.createGunzip()) : raw;
  source.setEncoding('utf8');
  let buffer = '';
  let checked = false;
  for await (const chunk of source as AsyncIterable<string>) {
    buffer += chunk;
    if (!checked) {
      const end = buffer.indexOf('</siteinfo>');
      if (end === -1) {
        if (buffer.includes('<page>')) throw new InvalidDump('no <siteinfo> before the first page');
        continue;
      }
      checkSite(buffer.slice(0, end));
      checked = true;
    }
    let end: number;
    while ((end = buffer.indexOf('</page>')) !== -1) {
      const start = buffer.lastIndexOf('<page>', end);
      if (start !== -1) yield parsePage(buffer.slice(start + 6, end));
      buffer = buffer.slice(end + 7);
    }
  }
  if (!checked) throw new InvalidDump(`${file} isn't a MediaWiki XML dump (no <siteinfo>)`);
}

// MediaWiki's title rules, enough to match a redirect or a recipe ingredient to a page: underscores are spaces and
// the first letter is a capital.
export function normalizeTitle(title: string): string {
  const spaced = title.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const SCOPE_ORDER = Object.entries(SCOPE).map(([template, kind]) => [template.toLowerCase(), kind] as const);

/**
 * The page's kind when it's in the mirror's scope, else null: a main-namespace article that uses one of the game-data
 * infoboxes (the first in SCOPE's order wins), or one of the mechanics pages named in MECHANICS.
 */
export function scopeKind(page: Pick<DumpPage, 'ns' | 'redirect' | 'title' | 'content'>): string | null {
  if (page.ns !== 0 || page.redirect !== null) return null;
  if (/infobox/i.test(page.content)) {
    const keys = new Set(topTemplates(cleanSource(page.content)).map(template => template.key));
    const match = SCOPE_ORDER.find(([key]) => keys.has(key));
    if (match) return match[1];
  }
  return MECHANICS.includes(page.title) ? 'mechanic' : null;
}

export interface DumpScan {
  pages: Page[];
  /** Main-namespace redirects: normalized title → target title (any #section dropped). */
  redirects: Map<string, string>;
  /** The newest revision in the dump: when the copy was taken, give or take the dump's own run. */
  latest: string;
  mechanicsMissing: string[];
}

export async function scanDump(file: string): Promise<DumpScan> {
  const pages: Page[] = [];
  const redirects = new Map<string, string>();
  let latest = '';
  let seen = 0;
  for await (const page of readDump(file)) {
    if (page.revTimestamp > latest) latest = page.revTimestamp;
    if (page.ns === 0 && page.redirect !== null)
      redirects.set(normalizeTitle(page.title), normalizeTitle(page.redirect.split('#')[0] ?? ''));
    const kind = scopeKind(page);
    if (kind) pages.push({ pageId: page.pageId, title: page.title, kind, revId: page.revId, revTimestamp: page.revTimestamp, content: page.content });
    if (process.stdout.isTTY && ++seen % 5000 === 0) process.stdout.write(`\r📖 Read ${seen} pages`);
  }
  if (process.stdout.isTTY && seen >= 5000) process.stdout.write('\n');
  const found = new Set(pages.filter(page => page.kind === 'mechanic').map(page => page.title));
  const inScope = new Set(pages.map(page => page.title));
  return {
    pages,
    redirects,
    latest,
    mechanicsMissing: MECHANICS.filter(title => !found.has(title) && !inScope.has(title))
  };
}

/** Follows a redirect (up to three hops, as MediaWiki allows double redirects to be fixed later). */
export function followRedirect(redirects: Map<string, string>, title: string): string | null {
  let current = normalizeTitle(title);
  for (let hop = 0; hop < 3; hop++) {
    const next = redirects.get(current);
    if (!next) return hop ? current : null;
    current = next;
  }
  return current;
}
