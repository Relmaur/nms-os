// Notes: everything the player wrote down, newest first, with search and a Markdown import. Each note can also be
// pinned to Home or a Guide book (ADR-0007). They're part of the log: on this device, in Export, and in sync.
import { useState } from 'react';
import { byNewest, searchNotes } from '@atlas/core/notes';
import { useAppState } from '../useAppState.ts';
import { importNoteFiles } from '../actions.ts';
import { openNoteEditor } from '../parts/editor-store.ts';
import { NoteCard } from './NoteCard.tsx';

export function Notes() {
  const { notes } = useAppState();
  const [query, setQuery] = useState('');
  const shown = query.trim() ? searchNotes(notes, query) : [...notes].sort(byNewest);
  return (
    <>
      <div className="hud-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl font-bold text-white">Notes</h1>
            <p className="text-sm text-slate-300 mt-1.5">
              Your own findings: layouts, routes, what worked. Pin a note to Home or to a Guide book to keep it next to
              what it’s about.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="h-10 px-3 rounded-xl border border-slate-700 text-sm text-slate-200 hover:bg-slate-900 flex items-center gap-2 cursor-pointer focus-within:ring-2 focus-within:ring-cyan-400">
              <i className="ph-bold ph-upload-simple" aria-hidden="true" />
              Import .md
              <input
                type="file"
                multiple
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                onChange={event => {
                  void importNoteFiles([...(event.target.files ?? [])]);
                  event.target.value = ''; // the same files can be picked again
                }}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                openNoteEditor();
              }}
              className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition"
            >
              <i className="ph-bold ph-plus" aria-hidden="true" /> New note
            </button>
          </div>
        </div>
        {notes.length > 0 && (
          <input
            type="search"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
            }}
            placeholder="Search your notes"
            aria-label="Search your notes"
            className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base md:text-sm text-white placeholder:text-slate-400"
          />
        )}
      </div>
      <div id="notesList" className="space-y-4">
        {shown.map(note => (
          <NoteCard key={note.id} note={note} level={2} />
        ))}
        {!notes.length && (
          <p className="text-sm text-slate-400 px-1">
            No notes yet. Write one, or import Markdown files you already keep.
          </p>
        )}
        {notes.length > 0 && !shown.length && (
          <p className="text-sm text-slate-400 px-1">Nothing matches “{query.trim()}”.</p>
        )}
      </div>
    </>
  );
}
