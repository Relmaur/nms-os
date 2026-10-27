// Markdown to safe HTML, shared by the Codex's articles and the player's notes. Notes reach a device from every
// device paired with it (ADR-0005), so the allowlist is strict: text formatting, lists, tables and links only; links
// are http(s) or relative; no images (they would fetch from anywhere), no style, id or name (no restyling the page
// or clobbering globals). [[Name]] links are resolved by the caller before this runs.
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  ...['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'kbd', 'sub', 'sup'],
  ...['strong', 'em', 'b', 'i', 'del', 's', 'ul', 'ol', 'li', 'a'],
  ...['table', 'thead', 'tbody', 'tr', 'th', 'td']
];
const ALLOWED_ATTR = ['href', 'title', 'colspan', 'rowspan', 'align', 'start'];
// http(s), or relative: no scheme before the first / ? #, and never `//host`, `/\host` or `\host`, which browsers
// read as another site.
const SAFE_URL = /^(?:https?:|#|\.{1,2}\/|\/(?![/\\])|[^:/?#\\]+(?:[/?#]|$))/i;

// External links open in a new tab, without handing the opener over.
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') ?? '')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function markdownToFragment(markdown: string): DocumentFragment {
  // Without async extensions marked parses synchronously; its type still allows a promise.
  const parsed = marked.parse(markdown, { async: false });
  return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: SAFE_URL,
    RETURN_DOM_FRAGMENT: true
  });
}

export function markdownToHtml(markdown: string): string {
  const holder = document.createElement('div');
  holder.append(markdownToFragment(markdown));
  return holder.innerHTML;
}
