// Quick look at a result without leaving the list: a side panel from md, a bottom sheet below (bar and swipe, no ✕).
import { useEffect, useMemo, useRef } from 'react';
import type { CodexIndex } from '@atlas/core/codex';
import type { PreparedEntry } from '@atlas/core/search';
import { SheetGrab, useSheetDrag, useSheetOpen } from '../parts/Sheet.tsx';
import { SourceBadge, StatusBadge, categoryLabel } from './bits.tsx';
import { renderMarkdown } from './markdown.ts';

export function QuickLook(props: {
  entry: PreparedEntry | null;
  index: CodexIndex;
  q: string;
  href: string;
  onClose: () => void;
}) {
  const { entry, onClose } = props;
  const panel = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const html = useMemo(
    () =>
      entry
        ? renderMarkdown(entry.body ?? `# ${entry.title}\n\n${entry.summary ?? ''}`, props.index, props.q).html
        : '',
    [entry, props.index, props.q]
  );
  useSheetDrag(panel, onClose);
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
  }, [entry]);
  // On a phone it's a modal sheet over the list: the list stays put, and focus moves into it and back.
  const title = useRef<HTMLHeadingElement>(null);
  useSheetOpen(entry !== null, onClose, { layout: '(max-width: 767px)', focus: title });

  const open = entry !== null;
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-950/50 md:bg-slate-950/30 transition-opacity duration-200 ${open ? '' : 'opacity-0 pointer-events-none'}`}
      />
      <aside
        ref={panel}
        id="peekPanel"
        aria-labelledby="peekTitle"
        aria-hidden={!open}
        inert={!open}
        className={`fixed z-50 flex flex-col bg-slate-950 border-slate-700 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] inset-x-0 bottom-0 h-[85dvh] rounded-t-3xl border-t md:inset-x-auto md:right-0 md:top-0 md:h-full md:w-[min(36rem,48vw)] md:rounded-none md:border-t-0 md:border-l md:translate-y-0 ${open ? '' : 'translate-y-full md:translate-x-full'}`}
      >
        <div data-sheet-grab className="px-5 pt-3 md:pt-4 pb-4 border-b border-slate-800 space-y-3">
          <SheetGrab onClose={onClose} label="Close quick look" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {entry ? (
                  <>
                    <SourceBadge source={entry.source} />
                    <StatusBadge entry={entry} />
                    <span>{categoryLabel(entry.category)}</span>
                  </>
                ) : null}
              </p>
              <h2
                ref={title}
                tabIndex={-1}
                id="peekTitle"
                className="outline-none font-display font-bold text-lg text-white mt-1.5 leading-snug"
              >
                {entry?.title ?? 'Quick look'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close quick look"
              className="hidden md:flex shrink-0 w-9 h-9 -mr-1.5 rounded-xl items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <i className="ph-bold ph-x text-lg" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <a
              id="peekOpen"
              href={props.href}
              className="h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold flex items-center gap-2 transition"
            >
              Open article <i className="ph-bold ph-arrow-right" aria-hidden="true" />
            </a>
            <span className="hidden md:inline text-xs text-slate-400 ml-auto">
              <kbd className="font-mono border border-slate-700 rounded px-1">↑</kbd>{' '}
              <kbd className="font-mono border border-slate-700 rounded px-1">↓</kbd> browse ·{' '}
              <kbd className="font-mono border border-slate-700 rounded px-1">Enter</kbd> open
            </span>
          </div>
        </div>
        <div
          ref={body}
          id="peekBody"
          className="md-body flex-1 overflow-y-auto overscroll-contain px-5 py-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </aside>
    </>
  );
}
