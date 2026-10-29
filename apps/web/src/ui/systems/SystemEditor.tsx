// Add or edit a system. The draft lives here until Save; the stored system changes only through saveSystem().
import { useEffect, useId, useState, type SubmitEvent, type KeyboardEvent, type ReactNode } from 'react';
import { tagSuggestions } from '@atlas/core/systems-list';
import {
  CONFLICT_LEVELS,
  RACES,
  STAR_CLASSES,
  newId,
  normalizeGlyphs,
  normalizeSystem,
  tagSlug,
  type System
} from '@atlas/core/systems-model';
import { saveSystem } from '../actions.ts';
import { useAppState } from '../useAppState.ts';
import { showToast } from '../../app/ui.ts';
import { closeSystemPanel, dismissSystemPanel, openSystem, setCloseGuard, type EditorPreset } from './panel-store.ts';
import { SheetGrab } from '../parts/Sheet.tsx';

type Draft = Omit<System, 'wealth'> & { wealth: string };
type TextField = 'name' | 'region' | 'galaxy' | 'glyphs' | 'economy' | 'notes';

export function SystemEditor({ existing, preset }: { existing: System | undefined; preset: EditorPreset }) {
  const state = useAppState();
  const isNew = !existing;
  const [draft, setDraft] = useState<Draft>(() => {
    const base = existing ? structuredClone(existing) : normalizeSystem({ ...preset, id: newId('sys') });
    return { ...base, name: isNew && base.name === 'Unnamed system' ? '' : base.name, wealth: String(base.wealth) };
  });
  const [tags, setTags] = useState(draft.tags);
  const [typed, setTyped] = useState('');
  const [arrived, setArrived] = useState(true);
  const [error, setError] = useState('');
  const set = (changes: Partial<Draft>) => {
    setDraft(current => ({ ...current, ...changes }));
  };
  const cancel = closeSystemPanel;

  // A swipe or a tap on the bar leaves only when nothing would be lost; Cancel stays the way to discard.
  const [original] = useState(() => JSON.stringify({ draft, tags }));
  const dirty = typed.trim() !== '' || JSON.stringify({ draft, tags }) !== original;
  useEffect(() => {
    setCloseGuard(() => {
      if (dirty) showToast('Unsaved changes: save, or Cancel to discard.');
      return !dirty;
    });
    return () => {
      setCloseGuard(null);
    };
  }, [dirty]);

  const addTag = (value: string) => {
    const tag = tagSlug(value);
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTyped('');
    document.getElementById('tagInput')?.focus();
  };
  const onTagKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (typed.trim()) addTag(typed);
    } else if (event.key === 'Backspace' && !typed && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pendingTag = tagSlug(typed); // a tag typed but not yet added still counts
    const allTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags;
    const glyphs = normalizeGlyphs(draft.glyphs);
    if (!draft.name.trim()) {
      setError('The system needs a name.');
      return;
    }
    if (glyphs && glyphs.length !== 12) {
      setError('Portal glyphs are 12 hex digits (0–9, A–F), or leave them empty.');
      return;
    }
    const system = normalizeSystem({ ...draft, glyphs, tags: allTags, galaxy: draft.galaxy.trim() || 'Euclid' });
    saveSystem(system, { arrived: isNew && arrived });
    // A new system opens on its own screen; an edited one is already showing under the sheet.
    if (isNew) openSystem(system.id);
    else closeSystemPanel();
  };

  const text = (field: TextField) => ({
    name: field,
    value: draft[field],
    onChange: (event: { target: { value: string } }) => {
      set({ [field]: event.target.value });
    }
  });

  return (
    <form id="systemEditor" onSubmit={submit} className="flex flex-col min-h-full">
      <div
        data-sheet-grab
        className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-5 pt-3 md:pt-5 pb-4"
      >
        <SheetGrab onClose={dismissSystemPanel} />
        <div className="flex items-center justify-between gap-3">
          <h2 id="systemPanelTitle" className="font-display font-bold text-lg text-white">
            {isNew ? 'Add system' : 'Edit system'}
          </h2>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel"
            className="hidden md:flex w-9 h-9 -mr-1.5 rounded-xl items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900"
          >
            <i className="ph-bold ph-x text-lg" />
          </button>
        </div>
      </div>
      <div className="flex-1 px-5 py-5 space-y-5">
        <label className="field">
          System name <span className="text-rose-300">*</span>
          <input
            id="sysName"
            required
            maxLength={80}
            placeholder="As shown in the Discoveries / Galaxy Map"
            autoFocus
            {...text('name')}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="field">
            Region
            <input maxLength={80} placeholder="e.g. Ezdaranit Spur" {...text('region')} />
          </label>
          <label className="field">
            Galaxy
            <input maxLength={40} placeholder="Euclid" {...text('galaxy')} />
          </label>
          <label className="field">
            Portal glyphs
            <input
              maxLength={16}
              placeholder="0123456789AB"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono uppercase"
              {...text('glyphs')}
            />
          </label>
          <label className="field">
            Economy
            <input list="economyOptions" maxLength={40} placeholder="e.g. Trading" {...text('economy')} />
          </label>
        </div>
        <Segmented
          label="Star colour"
          value={draft.star}
          onChange={star => {
            set({ star: star as Draft['star'] });
          }}
          options={[
            ['', 'Unknown'],
            ...Object.entries(STAR_CLASSES).map(([key, star]): Option => [
              key,
              star.label,
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: star.color }} />
            ])
          ]}
        />
        <Segmented
          label="Dominant race"
          value={draft.race}
          onChange={race => {
            set({ race: race as Draft['race'] });
          }}
          options={[['', 'Unknown'], ...Object.entries(RACES)]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Segmented
            label="Wealth"
            value={draft.wealth}
            onChange={wealth => {
              set({ wealth });
            }}
            options={[
              ['0', 'Unknown'],
              ['1', '★'],
              ['2', '★★'],
              ['3', '★★★']
            ]}
          />
          <Segmented
            label="Conflict"
            value={draft.conflict}
            onChange={conflict => {
              set({ conflict: conflict as Draft['conflict'] });
            }}
            options={[
              ['', '?'],
              ...Object.entries(CONFLICT_LEVELS).map(([key, label]): Option => [
                key,
                key === 'pirate' ? 'Pirate' : label
              ])
            ]}
          />
        </div>
        {/* System detail (03) shows the rating; this is where it's set, as in the editor's design (06). */}
        <Segmented
          label="Your rating"
          value={String(draft.rating)}
          onChange={rating => {
            set({ rating: Number(rating) });
          }}
          options={[
            ['0', 'None'],
            ...[1, 2, 3, 4, 5].map((n): Option => [
              String(n),
              String(n),
              <i key="star" className="ph-fill ph-star text-amber-300 mr-1" aria-hidden="true" />
            ])
          ]}
        />
        <div className="space-y-1.5">
          <p className="field-label">
            <label htmlFor="tagInput">Tags</label>
          </p>
          <div
            id="tagEditor"
            className="flex flex-wrap items-center gap-1.5 min-h-10 p-1.5 rounded-xl bg-slate-900 border border-slate-700 focus-within:border-emerald-400"
            onClick={() => document.getElementById('tagInput')?.focus()}
          >
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-100"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => {
                    setTags(tags.filter(item => item !== tag));
                  }}
                  aria-label={`Remove ${tag}`}
                  className="w-5 h-5 rounded flex items-center justify-center hover:bg-emerald-500/20"
                >
                  <i className="ph-bold ph-x text-[10px]" />
                </button>
              </span>
            ))}
            <input
              id="tagInput"
              type="text"
              maxLength={40}
              value={typed}
              onChange={event => {
                setTyped(event.target.value);
              }}
              onKeyDown={onTagKey}
              placeholder={tags.length ? 'Add tag' : 'Type a tag and press Enter'}
              className="flex-1 min-w-[8rem] h-7 bg-transparent px-1.5 text-base sm:text-sm text-white focus:outline-hidden"
            />
          </div>
          <div id="tagSuggestions" className="flex flex-wrap gap-1.5">
            {tagSuggestions(state.systems, tags, tagSlug(typed))
              .slice(0, 12)
              .map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    addTag(tag);
                  }}
                  className="h-7 px-2 rounded-md border border-dashed border-slate-600 text-xs text-slate-300 hover:text-white hover:border-slate-400"
                >
                  {`+ ${tag}`}
                </button>
              ))}
          </div>
        </div>
        {isNew ? (
          <>
            <label className="field">
              Notes
              <textarea
                rows={4}
                maxLength={5000}
                placeholder="First impressions, what's here, why it matters"
                {...text('notes')}
              />
            </label>
            <label className="flex items-center gap-2.5 text-sm text-slate-200">
              <input
                name="logVisit"
                type="checkbox"
                checked={arrived}
                onChange={event => {
                  setArrived(event.target.checked);
                }}
                className="w-4 h-4 accent-emerald-400"
              />
              I'm here now (log a visit)
            </label>
          </>
        ) : null}
      </div>
      <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-5 py-3 flex items-center justify-end gap-2">
        <p id="editorError" role="alert" className="mr-auto text-xs text-rose-300">
          {error}
        </p>
        <button
          type="button"
          onClick={cancel}
          className="h-10 px-4 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold"
        >
          {isNew ? 'Add system' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

type Option = [value: string, label: string, extra?: ReactNode];

function Segmented({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  return (
    <div className="space-y-1.5">
      <p id={labelId} className="field-label">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby={labelId}>
        {options.map(([key, text, extra]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={value === key}
            onClick={() => {
              onChange(key);
            }}
            className={`seg ${value === key ? 'is-on' : ''}`}
          >
            {extra}
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
