// Write or edit a note: a title, Markdown with a preview, and where else it shows (Home, a book). The draft lives
// here until Save.
import { useCallback, useMemo, useState, type SubmitEvent } from 'react';
import { newId } from '@atlas/core/systems-model';
import { MAX_NOTE_CHARS, PIN_PLACES, type Note } from '@atlas/core/notes';
import { deleteNote, saveNote } from '../actions.ts';
import { showToast } from '../../app/ui.ts';
import { closeEditor } from '../parts/editor-store.ts';
import { Modal } from '../parts/Modal.tsx';
import { renderNote } from './NoteCard.tsx';

export function NoteEditor({ existing, pins }: { existing: Note | undefined; pins: string[] }) {
  const [draft, setDraft] = useState<Note>(() => {
    if (existing) return structuredClone(existing);
    const now = new Date().toISOString();
    return { id: newId('note'), title: '', body: '', pins, createdAt: now, updatedAt: now };
  });
  const [original] = useState(() => JSON.stringify(draft));
  // Deleted on another device (or tab) while open: the first Save says so, a second one keeps it on purpose.
  const [wasSaved] = useState(Boolean(existing));
  const [restore, setRestore] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(draft) !== original;
  const html = useMemo(() => (preview ? renderNote(draft.body) : ''), [preview, draft.body]);

  const dismiss = useCallback(() => {
    if (dirty) showToast('Unsaved note: save it, or Cancel to discard.');
    else closeEditor();
  }, [dirty]);

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim() && !draft.body.trim()) {
      setError('Write a title or some text first.');
      return;
    }
    if (wasSaved && !existing && !restore) {
      setRestore(true);
      setError('This note was deleted on another device. Save again to keep it.');
      return;
    }
    saveNote({ ...draft, title: draft.title.trim() || 'Untitled note' });
    closeEditor();
  };
  const togglePin = (key: string) => {
    setDraft(current => ({
      ...current,
      pins: current.pins.includes(key) ? current.pins.filter(pin => pin !== key) : [...current.pins, key]
    }));
  };

  return (
    <Modal
      id="noteEditor"
      onSubmit={submit}
      title={wasSaved ? 'Edit note' : 'New note'}
      titleId="noteEditorTitle"
      dismiss={dismiss}
      onClose={closeEditor}
      footer={
        <>
          <p role="alert" className="mr-auto text-xs text-rose-300">
            {error}
          </p>
          {existing &&
            (confirmDelete ? (
              <button
                type="button"
                onClick={() => {
                  deleteNote(existing.id);
                  closeEditor();
                }}
                className="h-10 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-sm font-semibold"
              >
                Delete for good
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(true);
                }}
                className="h-10 px-3 rounded-xl text-sm text-rose-300 hover:bg-rose-500/10"
              >
                Delete
              </button>
            ))}
          <button
            type="button"
            onClick={closeEditor}
            className="h-10 px-4 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold"
          >
            {wasSaved ? 'Save' : 'Add note'}
          </button>
        </>
      }
    >
      <label className="field">
        Title
        <input
          id="noteTitle"
          maxLength={120}
          autoFocus
          placeholder="e.g. My flagship’s Infra-Knife layout"
          value={draft.title}
          onChange={event => {
            setDraft({ ...draft, title: event.target.value });
          }}
        />
      </label>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="noteBody" className="field-label">
            Note
          </label>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Write or preview">
            {(['Write', 'Preview'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={preview === (mode === 'Preview')}
                onClick={() => {
                  setPreview(mode === 'Preview');
                }}
                className={`seg ${preview === (mode === 'Preview') ? 'is-on' : ''}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        {preview ? (
          <div
            id="notePreview"
            className="md-body text-sm min-h-[12rem] bg-slate-900/50 border border-slate-800 rounded-xl p-4"
            dangerouslySetInnerHTML={{ __html: html || '<p>Nothing to preview yet.</p>' }}
          />
        ) : (
          <textarea
            id="noteBody"
            rows={12}
            maxLength={MAX_NOTE_CHARS}
            value={draft.body}
            onChange={event => {
              setDraft({ ...draft, body: event.target.value });
            }}
            placeholder={
              'Markdown works: **bold**, - lists, | tables |.\nLink a Codex page with [[Infra-Knife Accelerator]].'
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base md:text-sm font-mono text-white"
          />
        )}
      </div>
      <fieldset className="space-y-1.5">
        <legend className="field-label">Also show it on</legend>
        <div className="flex flex-wrap gap-1.5">
          {PIN_PLACES.map(place => (
            <label
              key={place.key}
              className={`seg cursor-pointer focus-within:ring-2 focus-within:ring-cyan-400 ${draft.pins.includes(place.key) ? 'is-on' : ''}`}
            >
              <input
                type="checkbox"
                name="pins"
                value={place.key}
                checked={draft.pins.includes(place.key)}
                onChange={() => {
                  togglePin(place.key);
                }}
                className="sr-only"
              />
              {place.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-400">Every note is in Notes; pinned ones also show there.</p>
      </fieldset>
    </Modal>
  );
}
