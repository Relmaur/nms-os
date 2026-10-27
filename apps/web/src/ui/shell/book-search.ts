// "In the manual": the books' text exists only in their rendered markup (all six stay mounted, hidden), so the
// header search reads the smallest text blocks of each book from the DOM.
const BLOCKS = 'h2, h3, p, li, tr, [data-check]';

export interface BookHit {
  el: Element;
  section: string; // book1…book6
  title: string;
  text: string;
}

export function findBookHits(tokens: string[], limit: number): BookHit[] {
  const hits: (BookHit & { score: number })[] = [];
  const seen = new Set<string>();
  document.querySelectorAll('.book-section[id^="sec-book"]').forEach(section => {
    const title = section.querySelector('h1')?.textContent.trim() ?? section.id;
    section.querySelectorAll(BLOCKS).forEach(el => {
      if (el.querySelector(BLOCKS)) return; // prefer the innermost block
      if (el.closest('[data-player]')) return; // the player's notes pinned under a book aren't the manual
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      const lower = text.toLowerCase();
      if (!text || seen.has(lower) || !tokens.every(token => lower.includes(token))) return;
      seen.add(lower);
      const score = /^H[23]$/.test(el.tagName) ? 2 : 1;
      hits.push({ el, section: section.id.slice(4), title, text, score });
    });
  });
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function snippetAround(text: string, token: string, radius = 70): string {
  const at = Math.max(0, text.toLowerCase().indexOf(token));
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + token.length + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

// Scroll a found block into view and flash it, restarting the flash on repeat jumps.
export function flash(el: Element): void {
  if (!el.isConnected) return;
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('search-flash');
    el.getBoundingClientRect(); // forces a reflow, so a repeat jump restarts the flash
    el.classList.add('search-flash');
    setTimeout(() => {
      el.classList.remove('search-flash');
    }, 2300);
  });
}
