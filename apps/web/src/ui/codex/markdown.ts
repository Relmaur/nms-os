// Article Markdown to safe HTML: [[wiki links]] become Codex links (or plain text when the page isn't in the
// archive), the result is sanitised with DOMPurify, and h2/h3 get stable ids for the table of contents.
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { WIKI_LINK, articleHref, headingIds, splitLink, type CodexIndex } from '@atlas/core/codex';

// External links open in a new tab, without handing the opener over.
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') ?? '')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

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
  // Without async extensions marked parses synchronously; its type still allows a promise.
  const parsed = marked.parse(linked, { async: false });
  const holder = document.createElement('div');
  holder.append(DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '', { RETURN_DOM_FRAGMENT: true }));
  const nodes = [...holder.querySelectorAll('h2, h3')];
  const ids = headingIds(nodes.map(node => node.textContent));
  const headings = nodes.map((node, i) => {
    const id = ids[i] ?? '';
    node.id = id;
    return { id, text: node.textContent.trim(), depth: node.tagName === 'H3' ? 3 : 2 } satisfies Heading;
  });
  return { html: holder.innerHTML, headings };
}
