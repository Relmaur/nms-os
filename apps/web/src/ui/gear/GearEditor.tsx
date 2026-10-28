// Add or edit a ship, Multi-Tool or Exosuit. Supercharged slots are marked by tapping the inventory grid (SlotPicker),
// which follows the wiki's cited rules for the kind and class.
import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import { newId } from '@atlas/core/systems-model';
import { GEAR_KINDS, ROLE_SUGGESTIONS, slotRules, type GearItem, type GearKind } from '@atlas/core/gear';
import { deleteGear, saveGear } from '../actions.ts';
import { showToast } from '../../app/ui.ts';
import { closeEditor } from '../parts/editor-store.ts';
import { Modal } from '../parts/Modal.tsx';
import { SlotPicker } from './SlotPicker.tsx';
import { KINDS } from './kinds.ts';
import { loadFacts, useFacts } from './facts-store.ts';

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
        slotLabels: {},
        notes: '',
        createdAt: new Date().toISOString()
      }
  );
  const [original] = useState(() => JSON.stringify(draft));
  // Deleted on another device (or tab) while open: the first Save says so, a second one keeps it on purpose.
  const [wasSaved] = useState(Boolean(existing));
  const [restore, setRestore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const dirty = JSON.stringify(draft) !== original;
  const facts = useFacts();
  const rules = slotRules(facts, draft.kind, draft.class);
  useEffect(() => {
    void loadFacts();
  }, []);
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
    if (wasSaved && !existing && !restore) {
      setRestore(true);
      setError(`${draft.name} was deleted on another device. Save again to keep it.`);
      return;
    }
    saveGear(draft.kind === 'exosuit' ? { ...draft, class: '', type: '' } : draft); // fields hidden for an Exosuit
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
      title={wasSaved ? `Edit ${KINDS[draft.kind].label}` : 'Add to your gear'}
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
        {GEAR_KINDS.map(key => (
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
            {KINDS[key].label}
          </button>
        ))}
      </div>
      <label className="field">
        Name <span className="text-rose-300">*</span>
        <input id="gearName" required maxLength={80} autoFocus placeholder="As named in game" {...field('name')} />
      </label>
      {draft.kind !== 'exosuit' && (
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
      )}
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
      <SlotPicker
        slots={draft.superchargedSlots}
        labels={draft.slotLabels}
        kind={draft.kind}
        cls={draft.class}
        rules={rules}
        onChange={(superchargedSlots, slotLabels) => {
          set({ superchargedSlots, slotLabels });
        }}
      />
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
