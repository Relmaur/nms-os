// Article file names: the wiki sync writes wiki/<category>/<slug>.md and Codex drafts must land on the same name.
export function slugify(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}
