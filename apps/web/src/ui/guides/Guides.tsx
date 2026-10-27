// Guides: the six-book playbook for this save, with how far its checklists are ticked.
import { BOOKS, guideProgress } from '@atlas/core/guides';
import { useAppState } from '../useAppState.ts';

export function Guides() {
  const progress = guideProgress(useAppState().checklists);
  return (
    <>
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-white">Guides</h1>
        <p className="text-sm text-slate-300 mt-1.5">
          The six-book playbook. Your checklists live inside each book, and your own notes can sit under any of them.
        </p>
      </div>
      <div className="hud-card rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span id="guidesProgressLabel" className="text-slate-300">
            Checklist progress
          </span>
          <span id="guidesProgressText" className="font-mono text-xs font-semibold text-cyan-300 tabular-nums">
            {progress.done} of {progress.total} steps
          </span>
        </div>
        <div
          role="progressbar"
          aria-labelledby="guidesProgressLabel"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.pct}
          className="h-1.5 rounded-full bg-slate-800 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-cyan-400 transition-[width] duration-500"
            style={{ width: `${String(progress.pct)}%` }}
          />
        </div>
      </div>
      <ol id="guidesList" className="list-group">
        {BOOKS.map(book => {
          const p = progress.perBook[book.key];
          return (
            <li key={book.key}>
              <a href={`#${book.key}`} className="list-row">
                <span className={`nav-tile ${book.color}`} aria-hidden="true">
                  {book.numeral}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-white">
                    <span className="sr-only">Book {book.numeral}: </span>
                    {book.title}
                  </span>
                  <span className="block text-xs text-slate-400">{book.blurb}</span>
                </span>
                {p && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${p.done === p.total ? 'text-emerald-300' : 'text-slate-400'}`}
                  >
                    <span className="sr-only">checklist </span>
                    {p.done}/{p.total}
                  </span>
                )}
                <i className="ph-bold ph-caret-right text-slate-500" aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ol>
    </>
  );
}
