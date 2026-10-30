// The player's notes pinned to a place (a book, Home). In a book it sits after the guide text, marked as the
// player's own, and out of the header search's book index (data-player): their text never reads as the guide's.
import { notesPinnedTo } from '@atlas/core/notes';
import { useAppState } from '../useAppState.ts';
import { newNote } from './note-nav.ts';
import { NoteCard } from './NoteCard.tsx';

export function PinnedNotes({ place, label, hint }: { place: string; label: string; hint: string }) {
  const notes = notesPinnedTo(useAppState().notes, place);
  return (
    <section data-player aria-labelledby={`pinned-${place}`} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`pinned-${place}`} className="font-display font-bold text-base text-white flex items-center gap-2">
          <i className="ph-bold ph-note-pencil text-cyan-300" aria-hidden="true" />
          Your notes
        </h2>
        <button
          type="button"
          onClick={() => {
            newNote([place]);
          }}
          className="h-9 px-3 rounded-lg border border-slate-700 text-xs text-slate-200 hover:text-white hover:bg-slate-900 flex items-center gap-1.5"
        >
          <i className="ph-bold ph-plus" aria-hidden="true" />
          {`Add a note to ${label}`}
        </button>
      </div>
      {notes.length ? (
        notes.map(note => <NoteCard key={note.id} note={note} showPins={false} />)
      ) : (
        <p className="text-sm text-slate-400 border border-dashed border-slate-700 rounded-2xl px-4 py-3">{hint}</p>
      )}
    </section>
  );
}
