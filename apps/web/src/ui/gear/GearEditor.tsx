// Add or edit a ship or Multi-Tool. Supercharged slots are typed as R2C3 (row 2, column 3); the grid previews them.
import { useCallback, useState, type SubmitEvent } from 'react';
import { newId } from '@atlas/core/systems-model';
import { ROLE_SUGGESTIONS, parseSlots, type GearItem, type GearKind } from '@atlas/core/gear';
import { deleteGear, saveGear } from '../actions.ts';
import { showToast } from '../../app/ui.ts';
import { closeEditor } from '../parts/editor-store.ts';
import { Modal } from '../parts/Modal.tsx';
import { SlotGrid } from './GearCard.tsx';

const KINDS: [GearKind, string][] = [
  ['starship', 'Starship'],
  ['multitool', 'Multi-Tool']
];
const CLASSES = ['S', 'A', 'B', 'C'];

export function GearEditor({ existing, preset }: { existing: GearItem | undefined; preset: GearKind }) {
  const [draft, setDraft] = useState<GearItem>(
    () =>
      existing ?? {
        id: newId('gear'),
        kind: preset,
        name: '',
        class: '',
        type: '',
        role: '',
        superchargedSlots: [],
        notes: '',
        createdAt: new Date().toISOString()
      }
  );
  const [slotText, setSlotText] = useState(draft.superchargedSlots.join(' '));
  const [original] = useState(() => JSON.stringify({ draft, slotText }));
  // Deleted on another device (or tab) while open: the first Save says so, a second one keeps it on purpose.
  const [wasSaved] = useState(Boolean(existing));
  const [restore, setRestore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify({ draft, slotText }) !== original;
  const parsed = parseSlots(slotText);
  const set = (changes: Partial<GearItem>) => {
    setDraft(current => ({ ...current, ...changes }));
  };

  const dismiss = useCallback(() => {
    if (dirty) showToast('Unsaved changes: save, or Cancel to discard.');
    else closeEditor();
  }, [dirty]);

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError('Give it a name.');
      return;
    }
    if (parsed.rejected.length) {
      setError(`Slots look like R2C3 (row, column): check ${parsed.rejected.join(', ')}.`);
      return;
    }
    if (wasSaved && !existing && !restore) {
      setRestore(true);
      setError(`${draft.name} was deleted on another device. Save again to keep it.`);
      return;
    }
    saveGear({ ...draft, superchargedSlots: parsed.slots });
    closeEditor();
  };
  const field = (key: 'name' | 'class' | 'type' | 'role' | 'notes') => ({
    value: draft[key],
    onChange: (event: { target: { value: string } }) => {
      set({ [key]: event.target.value });
    }
  });

  return (
    <Modal
      id="gearEditor"
      onSubmit={submit}
      title={wasSaved ? `Edit ${draft.kind === 'multitool' ? 'Multi-Tool' : 'starship'}` : 'Add to your gear'}
      titleId="gearEditorTitle"
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
                  deleteGear(existing.id);
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
            {wasSaved ? 'Save' : 'Add'}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind">
        {KINDS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={draft.kind === key}
            onClick={() => {
              set({ kind: key });
            }}
            className={`seg ${draft.kind === key ? 'is-on' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="field">
        Name <span className="text-rose-300">*</span>
        <input id="gearName" required maxLength={80} autoFocus placeholder="As named in game" {...field('name')} />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="field">
          Class
          <input list="gearClasses" maxLength={20} placeholder="S, A, B, C" {...field('class')} />
        </label>
        <label className="field">
          Type
          <input
            maxLength={60}
            placeholder={draft.kind === 'multitool' ? 'e.g. Sentinel Rifle' : 'e.g. Interceptor'}
            {...field('type')}
          />
        </label>
      </div>
      <label className="field">
        Role
        <input list="gearRoles" maxLength={40} placeholder="e.g. Flagship" {...field('role')} />
      </label>
      <datalist id="gearClasses">
        {CLASSES.map(value => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="gearRoles">
        {ROLE_SUGGESTIONS.map(value => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <div className="space-y-2">
        <label className="field">
          Supercharged slots
          <input
            id="gearSlots"
            maxLength={200}
            spellCheck={false}
            autoCapitalize="characters"
            placeholder="R2C2 R2C3 R2C4 R3C7"
            className="font-mono uppercase"
            value={slotText}
            onChange={event => {
              setSlotText(event.target.value);
            }}
          />
        </label>
        <p className="text-xs text-slate-400">Row then column, counted from the top-left of the inventory grid.</p>
        {parsed.slots.length > 0 && <SlotGrid slots={parsed.slots} />}
      </div>
      <label className="field">
        Notes
        <textarea
          rows={5}
          maxLength={20_000}
          placeholder="Layout, what goes in each supercharged slot, plans. Markdown works."
          className="font-mono"
          {...field('notes')}
        />
      </label>
    </Modal>
  );
}
