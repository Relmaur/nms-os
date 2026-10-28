// Mark supercharged slots by tapping the inventory grid: tap to mark, tap again to clear. Each cell is a toggle button;
// one is in the Tab order at a time, and the arrow keys move between them (Space or Enter toggles), so 40 cells
// don't cost 40 Tab presses. "Add a row" grows the grid up to the largest inventory the wiki gives (slotRules), and
// each marked slot gets a field for what sits in it. The rules shown come from cited facts and link to their Codex
// pages; marks that disagree get a note, never a block: the player's inventory screen is the truth.
import { useRef, useState, type KeyboardEvent } from 'react';
import {
  MAX_LABEL,
  classLetter,
  slotGrid,
  slotWarnings,
  toggleSlot,
  type GearKind,
  type SlotRules
} from '@atlas/core/gear';
import { KINDS } from './kinds.ts';

const MIN_ROWS = 4; // the wiki: supercharged slots are "almost always in the first 3 or 4 lines"
const list = (slots: string[]) =>
  slots.length > 1 ? `${slots.slice(0, -1).join(', ')} and ${slots.at(-1) ?? ''}` : (slots[0] ?? '');
const codexHref = (path: string) => `wiki/#/a/${encodeURIComponent(path)}`;
const STEP: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1]
};

export function SlotPicker({
  slots,
  labels,
  kind,
  cls,
  rules,
  onChange
}: {
  slots: string[];
  labels: Record<string, string>;
  kind: GearKind;
  cls: string;
  rules: SlotRules;
  onChange: (slots: string[], labels: Record<string, string>) => void;
}) {
  const [rows, setRows] = useState(MIN_ROWS);
  const grid = slotGrid(slots, { rows: Math.min(rows, rules.maxRows), cols: rules.columns });
  const warn = slotWarnings(rules, slots);
  const letter = classLetter(cls);
  const name = KINDS[kind].label;
  const pages = [...new Map(rules.sources.map(fact => [fact.path, fact.page])).entries()];
  const fixed = rules.fixed;
  const missing = fixed?.filter(slot => !slots.includes(slot)) ?? [];
  const keep = (next: string[]) => Object.fromEntries(Object.entries(labels).filter(([key]) => next.includes(key)));
  const [moved, setFocus] = useState<[number, number]>([1, 1]);
  // Kept inside the grid: a lower class shrinks it, and the cell in the Tab order must still exist.
  const focus: [number, number] = [Math.min(moved[0], grid.rows), Math.min(moved[1], grid.cols)];
  const root = useRef<HTMLDivElement>(null);

  const onKey = (event: KeyboardEvent) => {
    const step = STEP[event.key];
    const target: [number, number] | null = step
      ? [Math.min(grid.rows, Math.max(1, focus[0] + step[0])), Math.min(grid.cols, Math.max(1, focus[1] + step[1]))]
      : event.key === 'Home'
        ? [focus[0], 1]
        : event.key === 'End'
          ? [focus[0], grid.cols]
          : null;
    if (!target) return;
    event.preventDefault();
    setFocus(target);
    root.current?.querySelector<HTMLButtonElement>(`[data-slot="R${String(target[0])}C${String(target[1])}"]`)?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p id="slotPickerLabel" className="field-label">
          Supercharged slots
        </p>
        <p className="text-xs font-mono text-amber-200/90" aria-live="polite">
          {slots.length ? slots.join(' · ') : 'none marked'}
        </p>
      </div>
      <div
        ref={root}
        id="slotPicker"
        role="group"
        aria-labelledby="slotPickerLabel"
        aria-describedby="slotPickerHint"
        onKeyDown={onKey}
        className="grid gap-1 sm:gap-1.5 max-w-md"
        style={{ gridTemplateColumns: `repeat(${String(grid.cols)}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: grid.rows * grid.cols }, (_, i) => {
          const row = Math.floor(i / grid.cols) + 1;
          const col = (i % grid.cols) + 1;
          const slot = `R${String(row)}C${String(col)}`;
          const on = grid.marked.has(slot);
          return (
            <button
              key={slot}
              type="button"
              data-slot={slot}
              aria-pressed={on}
              aria-label={`Row ${String(row)}, column ${String(col)}`}
              tabIndex={row === focus[0] && col === focus[1] ? 0 : -1}
              onClick={() => {
                setFocus([row, col]);
                const next = toggleSlot(slots, slot);
                onChange(next, keep(next));
              }}
              className={`aspect-square min-h-6 rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                on
                  ? 'bg-amber-300 border-amber-200 shadow-[0_0_8px_rgba(252,211,77,0.55)]'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-500'
              }`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <p id="slotPickerHint" className="flex-1 min-w-[12rem] text-xs text-slate-400">
          Tap the cells where the inventory shows a supercharged slot; tap again to clear. Row 1 is the top row.
        </p>
        {grid.rows < rules.maxRows && (
          <button
            type="button"
            onClick={() => {
              setRows(grid.rows + 1);
            }}
            className="h-8 px-2.5 rounded-lg border border-dashed border-slate-600 text-xs text-slate-300 hover:text-white hover:border-slate-400"
          >
            + Add a row
          </button>
        )}
      </div>
      {pages.length > 0 && (
        <p id="slotRules" className="text-xs text-slate-400">
          {rules.supercharged !== null &&
            (kind === 'exosuit'
              ? `${String(rules.supercharged)} supercharged slots, in the same places for every player. `
              : `${letter ?? ''}-class: ${String(rules.supercharged)} supercharged slot${rules.supercharged === 1 ? '' : 's'}. `)}
          Technology grid: {rules.columns} wide, up to {rules.maxRows} rows. From the wiki:{' '}
          {pages.map(([path, page], i) => (
            <span key={path}>
              {i > 0 && ', '}
              <a
                href={codexHref(path)}
                target="_blank"
                rel="noopener"
                className="text-cyan-300 hover:text-cyan-200 underline"
              >
                {page}
              </a>
            </span>
          ))}
          .
        </p>
      )}
      {(warn.tooMany || warn.outside.length > 0 || warn.offPreset.length > 0) && (
        <ul id="slotWarnings" className="space-y-1 text-xs text-amber-200" aria-live="polite">
          {warn.tooMany && !warn.offPreset.length && (
            <li>
              {kind === 'exosuit' ? 'The Exosuit has' : `${letter ?? ''}-class has`} {rules.supercharged} supercharged
              slot{rules.supercharged === 1 ? '' : 's'}; {slots.length} are marked.{' '}
              {kind === 'exosuit' ? 'Check the inventory screen.' : 'Check the class, or the inventory screen.'}
            </li>
          )}
          {warn.outside.length > 0 && (
            <li>
              {list(warn.outside)} {warn.outside.length > 1 ? 'are' : 'is'} outside the largest {name} grid the wiki
              gives ({rules.maxRows} rows of {rules.columns}).
            </li>
          )}
          {fixed && warn.offPreset.length > 0 && (
            <li>
              {list(warn.offPreset)} {warn.offPreset.length > 1 ? 'aren’t' : 'isn’t'} one of the Exosuit’s (
              {list(fixed)}).
            </li>
          )}
        </ul>
      )}
      {missing.length > 0 && (
        <button
          type="button"
          id="slotPreset"
          onClick={() => {
            const next = missing.reduce(toggleSlot, slots); // adds the missing ones; marks already there stay
            onChange(next, labels);
          }}
          className="h-8 px-2.5 rounded-lg border border-amber-300/40 text-xs text-amber-200 hover:bg-amber-300/10"
        >
          Mark the Exosuit’s slots ({list(missing)})
        </button>
      )}
      {slots.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="field-label">What’s in each one</p>
          {slots.map(slot => (
            <label key={slot} className="flex items-center gap-2">
              <span className="w-12 shrink-0 font-mono text-xs text-amber-200">{slot}</span>
              <input
                data-slot-label={slot}
                maxLength={MAX_LABEL}
                value={labels[slot] ?? ''}
                placeholder="e.g. Infra-Knife Accelerator"
                aria-label={`What’s in ${slot}`}
                onChange={event => {
                  onChange(slots, { ...labels, [slot]: event.target.value });
                }}
                className="flex-1 min-w-0 h-9 bg-slate-900 border border-slate-700 rounded-lg px-2.5 text-base sm:text-sm text-white placeholder:text-slate-500"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
