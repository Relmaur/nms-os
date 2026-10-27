// Article Markdown to safe HTML: [[wiki links]] become Codex links (or plain text when the page isn't in the
// archive), the result goes through the shared strict sanitiser, and h2/h3 get stable ids for the table of contents.
import { WIKI_LINK, articleHref, headingIds, splitLink, type CodexIndex } from '@atlas/core/codex';
import { markdownToFragment } from '../parts/safe-html.ts';

export interface Heading {
  id: string;
  text: string;
  depth: 2 | 3;
}
export interface Rendered {
  html: string;
  headings: Heading[];
}

export function renderMarkdown(markdown: string, index: CodexIndex, q = ''): Rendered {
  const body = markdown.replace(/^\s*#\s+[^\n]*\n*/, ''); // the page header already shows the title
  const linked = body.replace(WIKI_LINK, (_, inner: string) => {
    const { target, label } = splitLink(inner);
    const entry = index.find(target);
    return entry?.path ? `[${label}](${articleHref(entry.path, q)})` : label;
  });
  const holder = document.createElement('div');
  holder.append(markdownToFragment(linked));
  const nodes = [...holder.querySelectorAll('h2, h3')];
  const ids = headingIds(nodes.map(node => node.textContent));
  const headings = nodes.map((node, i) => {
    const id = ids[i] ?? '';
    node.id = id;
    return { id, text: node.textContent.trim(), depth: node.tagName === 'H3' ? 3 : 2 } satisfies Heading;
  });
  return { html: holder.innerHTML, headings };
}
