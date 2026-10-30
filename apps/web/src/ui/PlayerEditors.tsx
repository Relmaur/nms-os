// The gear editor (ships, Multi-Tools, the Exosuit), mounted once for the whole page. A new session remounts it, so
// every open starts from a fresh draft. Notes are edited on their own screen (notes/NoteEditor.tsx).
import { useAppState } from './useAppState.ts';
import { useEditing } from './parts/editor-store.ts';
import { GearEditor } from './gear/GearEditor.tsx';

export function PlayerEditors() {
  const editing = useEditing();
  const state = useAppState();
  if (!editing) return null;
  return (
    <GearEditor
      key={editing.session}
      existing={state.gear.find(item => item.id === editing.id)}
      preset={editing.preset}
    />
  );
}
