// The scope report for widening the mirror (`pnpm sync:wiki --discover <dump> --out <file>`): every infobox the wiki's
// articles use and every large category of articles without one, each with a proposed verdict (game, community or
// mixed). Read-only: it never touches wiki/. The verdicts are proposals for a person to approve, not rules.
import { cleanSource, topTemplates } from './wikitext.ts';
import { normalizeTitle, readDump, scopeKind, type DumpPage } from './dump.ts';

const SAMPLES = 5;
export const CATEGORY_MIN = 20;

// Infobox fields that mark a page as a player's discovery rather than a part of the game.
const DISCOVERY_FIELD = /discover|civili[sz]|uploaded|player|galaxy hub|hub/i;
// Names that point at community content: discoveries, civilizations and hubs, bases, people.
const COMMUNITY_NAME = /discover|civili[sz]|\bhub\b|player|\bbases?\b|user|catalog(ue)?|fan |community|wiki/i;

export type Verdict = 'game' | 'community' | 'mixed';
export interface InfoboxRow {
  name: string;
  pages: number;
  samples: string[];
  /** Pages whose infobox fills a discovery field, by field. */
  discoveryFields: Record<string, number>;
  inScope: number;
  verdict: Verdict;
  why: string;
}
export interface CategoryRow {
  name: string;
  pages: number;
  samples: string[];
  verdict: Verdict;
  why: string;
}
export interface DiscoverReport {
  articles: number;
  redirects: number;
  latest: string;
  infoboxes: InfoboxRow[];
  categories: CategoryRow[];
}

const INFOBOX_NAME = /\{\{\s*(?:template:)?([^{}|\n]*?infobox[^{}|\n]*?)\s*(?:\||\}\})/gi;
const CATEGORY = /\[\[\s*category\s*:\s*([^\]|]+)/gi;

interface Tally {
  pages: number;
  samples: string[];
  fields: Map<string, number>;
  inScope: number;
}
const tally = (map: Map<string, Tally>, name: string): Tally => {
  let row = map.get(name);
  if (!row) map.set(name, (row = { pages: 0, samples: [], fields: new Map(), inScope: 0 }));
  return row;
};

export function infoboxVerdict(name: string, pages: number, fields: Record<string, number>): [Verdict, string] {
  const [field, count] = Object.entries(fields).sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  const share = pages ? count / pages : 0;
  if (share >= 0.9) return ['community', `${Math.round(share * 100)}% fill “${field}”`];
  if (share >= 0.05) return ['mixed', `split on “${field}” (${Math.round(share * 100)}% fill it)`];
  if (COMMUNITY_NAME.test(name)) return ['community', 'the name points at community pages'];
  return ['game', count ? `only ${String(count)} fill “${field}”` : 'no discovery fields'];
}

export function categoryVerdict(name: string): [Verdict, string] {
  return COMMUNITY_NAME.test(name) ? ['community', 'the name points at community pages'] : ['game', 'by name'];
}

// Tallies pages one at a time, so a dump of any size streams through in constant memory.
export function collector(): { add: (page: DumpPage) => void; report: () => DiscoverReport } {
  const infoboxes = new Map<string, Tally>();
  const categories = new Map<string, Tally>();
  let articles = 0;
  let redirects = 0;
  let latest = '';
  const add = (page: DumpPage) => {
    if (page.ns !== 0) return;
    if (page.redirect !== null) {
      redirects++;
      return;
    }
    articles++;
    if (page.revTimestamp > latest) latest = page.revTimestamp;
    const names = new Set([...page.content.matchAll(INFOBOX_NAME)].map(match => normalizeTitle(match[1] ?? '')));
    if (names.size) {
      const inScope = scopeKind(page) !== null;
      const top = topTemplates(cleanSource(page.content));
      for (const name of names) {
        const row = tally(infoboxes, name);
        row.pages++;
        if (inScope) row.inScope++;
        if (row.samples.length < SAMPLES) row.samples.push(page.title);
        const box = top.find(template => template.key === name.toLowerCase());
        for (const [field, value] of Object.entries(box?.named ?? {}))
          if (value.trim() && DISCOVERY_FIELD.test(field)) row.fields.set(field, (row.fields.get(field) ?? 0) + 1);
      }
    } else {
      for (const match of page.content.matchAll(CATEGORY)) {
        const row = tally(categories, normalizeTitle(match[1] ?? ''));
        row.pages++;
        if (row.samples.length < SAMPLES) row.samples.push(page.title);
      }
    }
  };
  const report = (): DiscoverReport => ({
    articles,
    redirects,
    latest,
    infoboxes: [...infoboxes]
      .map(([name, row]) => {
        const fields = Object.fromEntries(row.fields);
        const [verdict, why] = infoboxVerdict(name, row.pages, fields);
        return { name, pages: row.pages, samples: row.samples, discoveryFields: fields, inScope: row.inScope, verdict, why };
      })
      .sort((a, b) => b.pages - a.pages || a.name.localeCompare(b.name)),
    categories: [...categories]
      .filter(([, row]) => row.pages > CATEGORY_MIN)
      .map(([name, row]) => {
        const [verdict, why] = categoryVerdict(name);
        return { name, pages: row.pages, samples: row.samples, verdict, why };
      })
      .sort((a, b) => b.pages - a.pages || a.name.localeCompare(b.name))
  });
  return { add, report };
}

export async function discover(file: string): Promise<DiscoverReport> {
  const tallies = collector();
  for await (const page of readDump(file)) tallies.add(page);
  return tallies.report();
}

const cell = (text: string) => text.replace(/\|/g, '\\|');

// The report as Markdown, for the person approving the scope.
export function reportMarkdown(report: DiscoverReport, dump: string): string {
  const fields = (row: InfoboxRow) =>
    Object.entries(row.discoveryFields)
      .map(([field, n]) => `${field} ${String(n)}`)
      .join(', ') || '–';
  return [
    '# Wiki scope report',
    '',
    `From \`${dump}\`: ${report.articles.toLocaleString('en')} articles and ${report.redirects.toLocaleString('en')} redirects in the main namespace; newest revision ${report.latest}.`,
    'Verdicts are proposals from the infobox fields and the names; nothing changes until the allow-list is approved.',
    '',
    '## Infoboxes',
    '',
    '| Infobox | Pages | Mirrored today | Discovery fields filled | Proposed | Why | Samples |',
    '|---|---:|---:|---|---|---|---|',
    ...report.infoboxes.map(
      row =>
        `| ${cell(row.name)} | ${String(row.pages)} | ${String(row.inScope)} | ${cell(fields(row))} | **${row.verdict}** | ${cell(row.why)} | ${cell(row.samples.join('; '))} |`
    ),
    '',
    `## Categories of articles without an infobox (more than ${String(CATEGORY_MIN)} pages)`,
    '',
    '| Category | Pages | Proposed | Why | Samples |',
    '|---|---:|---|---|---|',
    ...report.categories.map(
      row =>
        `| ${cell(row.name)} | ${String(row.pages)} | **${row.verdict}** | ${cell(row.why)} | ${cell(row.samples.join('; '))} |`
    ),
    ''
  ].join('\n');
}
