// One book of the playbook, the player's notes pinned to it, and the way back to Guides and to its neighbours. All six stay mounted (hidden by
// the section routing in nav.js) so the header search can find and scroll to text in any of them.
import type { ReactNode } from 'react';
import { BOOKS, type BookKey } from '@atlas/core/guides';
import { Book1 } from './books/Book1.tsx';
import { Book2 } from './books/Book2.tsx';
import { Book3 } from './books/Book3.tsx';
import { Book4 } from './books/Book4.tsx';
import { Book5 } from './books/Book5.tsx';
import { Book6 } from './books/Book6.tsx';
import { PinnedNotes } from '../notes/PinnedNotes.tsx';

const CONTENT: Record<BookKey, () => ReactNode> = {
  book1: Book1,
  book2: Book2,
  book3: Book3,
  book4: Book4,
  book5: Book5,
  book6: Book6
};

export function Book({ book }: { book: BookKey }) {
  const index = BOOKS.findIndex(item => item.key === book);
  const prev = BOOKS[index - 1];
  const next = BOOKS[index + 1];
  const Content = CONTENT[book];
  return (
    <>
      <a
        href="#guides"
        className="inline-flex items-center gap-1.5 h-9 -ml-1 px-1 text-sm font-medium text-cyan-300 hover:text-cyan-200"
      >
        <i className="ph-bold ph-caret-left" aria-hidden="true" />
        Guides
      </a>
      <Content />
      <PinnedNotes
        place={book}
        label={`Book ${BOOKS[index]?.numeral ?? ''}`}
        hint="Keep your own findings here (your layouts, routes, what worked): pin a note to this book."
      />
      <nav aria-label="More guides" className="grid grid-cols-2 gap-3 pt-2">
        {prev ? (
          <a href={`#${prev.key}`} className="book-pager text-left">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <i className="ph-bold ph-arrow-left" aria-hidden="true" />
              Book {prev.numeral}
            </span>
            <span className="block text-sm text-white truncate">{prev.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a href={`#${next.key}`} className="book-pager text-right">
            <span className="text-xs text-slate-400 flex items-center justify-end gap-1">
              Book {next.numeral}
              <i className="ph-bold ph-arrow-right" aria-hidden="true" />
            </span>
            <span className="block text-sm text-white truncate">{next.title}</span>
          </a>
        )}
      </nav>
    </>
  );
}
