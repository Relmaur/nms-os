// Schema guard for MediaWiki API responses used by the wiki sync. A response in an unexpected shape stops the sync
// before anything is written (no partial archive), naming the page at fault, instead of mirroring bad data.
import { z } from 'zod';

export class InvalidResponse extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidResponse';
  }
}

const IsoDate = z.string().refine(value => !Number.isNaN(Date.parse(value)));

const EmbeddedPage = z.looseObject({ pageid: z.int(), title: z.string() });
const EmbeddedIn = z.looseObject({ query: z.looseObject({ embeddedin: z.array(z.unknown()) }) });

const Revision = z.looseObject({
  revid: z.int(),
  timestamp: IsoDate,
  slots: z.looseObject({ main: z.looseObject({ content: z.string() }) })
});
// Key order matters: the first failing key decides the message, in the order a person would check them.
const RevisionPage = z.looseObject({
  pageid: z.int(),
  title: z.string(),
  revisions: z.tuple([Revision], z.unknown()) // only the latest revision is requested
});
const Revisions = z.looseObject({ query: z.looseObject({ pages: z.array(z.unknown()) }) });

export type EmbeddedPage = z.infer<typeof EmbeddedPage>;
export interface PageRevision {
  pageid: number;
  title: string;
  revid: number;
  timestamp: string;
  content: string;
}

// list=embeddedin → [{ pageid, title }]
export function readEmbeddedIn(data: unknown, template: string): EmbeddedPage[] {
  const parsed = EmbeddedIn.safeParse(data);
  if (!parsed.success) throw new InvalidResponse(`embeddedin for ${template}: no page list in the response`);
  return parsed.data.query.embeddedin.map(page => {
    const entry = EmbeddedPage.safeParse(page);
    if (!entry.success) {
      throw new InvalidResponse(
        `embeddedin for ${template}: entry ${JSON.stringify(page).slice(0, 120)} has no pageid/title`
      );
    }
    return entry.data;
  });
}

function revisionProblem(path: PropertyKey[]): string {
  if (path[0] === 'pageid' || path[0] === 'title') return 'has no pageid/title';
  if (path.includes('timestamp')) return 'has no valid timestamp';
  if (path.includes('slots')) return 'has no wikitext';
  return 'has no revision id';
}

// prop=revisions (formatversion=2) → [{ pageid, title, revid, timestamp, content }]. Pages deleted between the scope
// query and this one come back with `missing` and are skipped; the archive then marks them removed.
export function readRevisions(data: unknown): PageRevision[] {
  const parsed = Revisions.safeParse(data);
  if (!parsed.success) throw new InvalidResponse('revisions: no page list in the response');
  return parsed.data.query.pages
    .filter(page => !(page && typeof page === 'object' && 'missing' in page && page.missing))
    .map(page => {
      const result = RevisionPage.safeParse(page);
      if (!result.success) {
        const raw = (page ?? {}) as { pageid?: unknown; title?: unknown };
        const where = `page ${String(raw.pageid)} (${String(raw.title)})`;
        throw new InvalidResponse(`revisions: ${where} ${revisionProblem(result.error.issues[0]?.path ?? [])}`);
      }
      const {
        pageid,
        title,
        revisions: [revision]
      } = result.data;
      return { pageid, title, revid: revision.revid, timestamp: revision.timestamp, content: revision.slots.main.content };
    });
}
