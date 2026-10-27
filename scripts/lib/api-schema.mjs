// Schema guard for MediaWiki API responses used by the wiki sync. A response in an unexpected shape stops the sync
// before anything is written (no partial archive), naming the page at fault, instead of mirroring bad data.

export class InvalidResponse extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidResponse';
  }
}

const isDate = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));

// list=embeddedin → [{ pageid, title }]
export function readEmbeddedIn(data, template) {
  const pages = data?.query?.embeddedin;
  if (!Array.isArray(pages)) throw new InvalidResponse(`embeddedin for ${template}: no page list in the response`);
  for (const page of pages) {
    if (!Number.isInteger(page?.pageid) || typeof page?.title !== 'string') {
      throw new InvalidResponse(
        `embeddedin for ${template}: entry ${JSON.stringify(page).slice(0, 120)} has no pageid/title`
      );
    }
  }
  return pages;
}

// prop=revisions (formatversion=2) → [{ pageid, title, revid, timestamp, content }]. Pages deleted between the scope
// query and this one come back with `missing` and are skipped; the archive then marks them removed.
export function readRevisions(data) {
  const pages = data?.query?.pages;
  if (!Array.isArray(pages)) throw new InvalidResponse('revisions: no page list in the response');
  return pages
    .filter(page => !page?.missing)
    .map(page => {
      const revision = page?.revisions?.[0];
      const content = revision?.slots?.main?.content;
      const where = `page ${page?.pageid} (${page?.title})`;
      if (!Number.isInteger(page?.pageid) || typeof page?.title !== 'string')
        throw new InvalidResponse(`revisions: ${where} has no pageid/title`);
      if (!Number.isInteger(revision?.revid)) throw new InvalidResponse(`revisions: ${where} has no revision id`);
      if (!isDate(revision.timestamp)) throw new InvalidResponse(`revisions: ${where} has no valid timestamp`);
      if (typeof content !== 'string') throw new InvalidResponse(`revisions: ${where} has no wikitext`);
      return { pageid: page.pageid, title: page.title, revid: revision.revid, timestamp: revision.timestamp, content };
    });
}
