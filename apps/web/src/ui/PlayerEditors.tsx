// The editors for the player's own records (ships and Multi-Tools, notes), mounted once for the whole page. A new
// session remounts the editor, so every open starts from a fresh draft.
import { useAppState } from './useAppState.ts';
import { useEditing } from './parts/editor-store.ts';
import { GearEditor } from './gear/GearEditor.tsx';
import { NoteEditor } from './notes/NoteEditor.tsx';

export function PlayerEditors() {
  const editing = useEditing();
  const state = useAppState();
  if (!editing) return null;
  if (editing.kind === 'gear')
    return (
      <GearEditor
        key={editing.session}
        existing={state.gear.find(item => item.id === editing.id)}
        preset={editing.preset}
      />
    );
  return (
    <NoteEditor key={editing.session} existing={state.notes.find(note => note.id === editing.id)} pins={editing.pins} />
  );
}
