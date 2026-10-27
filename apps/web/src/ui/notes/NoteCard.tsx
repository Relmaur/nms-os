// One note as it reads anywhere it shows: its title, where it's pinned, and its Markdown (long ones fold, with Show
// all). [[Name]] links open the Codex's search for that name, since the main page doesn't load the Codex index.
import { useMemo, useState } from 'react';
import { PIN_PLACES, type Note } from '@atlas/core/notes';
import { markdownToHtml } from '../parts/safe-html.ts';
import { openNoteEditor } from '../parts/editor-store.ts';

const WIKI_LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
const FOLD_CHARS = 600;

export function renderNote(body: string): string {
  return markdownToHtml(
    body.replace(
      WIKI_LINK,
      (_, target: string, label?: string) =>
        `[${(label ?? target).replace(/[[\]]/g, '')}](wiki/#/?q=${encodeURIComponent(target.trim())})`
    )
  );
}

// `level`: h2 in the Notes list, h3 under a "Your notes" heading.
export function NoteCard({ note, showPins = true, level = 3 }: { note: Note; showPins?: boolean; level?: 2 | 3 }) {
  const Heading = level === 2 ? 'h2' : 'h3';
  const html = useMemo(() => renderNote(note.body), [note.body]);
  const long = note.body.length > FOLD_CHARS;
  const [all, setAll] = useState(false);
  const labels = PIN_PLACES.filter(place => note.pins.includes(place.key)).map(place => place.label);
  return (
    <article className="hud-card rounded-2xl p-4 sm:p-5 space-y-3" data-note={note.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading className="font-display font-bold text-base text-white break-words">{note.title}</Heading>
          {showPins && labels.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1.5">
              {labels.map(label => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-200"
                >
                  <i className="ph-bold ph-push-pin text-[10px]" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            openNoteEditor(note.id);
          }}
          aria-label={`Edit ${note.title}`}
          className="shrink-0 h-9 px-3 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white hover:bg-slate-900 flex items-center gap-1.5"
        >
          <i className="ph-bold ph-pencil-simple" aria-hidden="true" />
          Edit
        </button>
      </div>
      {note.body.trim() && (
        <div className={long && !all ? 'relative max-h-48 overflow-hidden' : ''}>
          <div className="md-body text-sm" dangerouslySetInnerHTML={{ __html: html }} />
          {long && !all && (
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
          )}
        </div>
      )}
      {long && (
        <button
          type="button"
          aria-expanded={all}
          onClick={() => {
            setAll(!all);
          }}
          className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
        >
          {all ? 'Show less' : 'Show all'}
        </button>
      )}
    </article>
  );
}
