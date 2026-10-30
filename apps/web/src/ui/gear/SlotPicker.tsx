// The editor's technology grid (design 12): tap a slot to mark it supercharged and select it, then say what sits in
// it. Tapping a marked slot selects it, and tapping it again unmarks it (as does "Unmark supercharged"). Each cell is
// a toggle button; one is in the Tab order at a time and the arrow keys move between them, so 60 cells don't cost 60
// Tab presses. The grid is as tall as the Rows control says, up to the largest inventory the wiki gives (slotRules).
// The rules come from cited facts and link to their Codex pages; marks that disagree get a note, never a block: the
// player's inventory screen is the truth.
import { useRef, useState, type KeyboardEvent } from 'react';
import {
  MAX_LABEL,
  classLetter,
  rulesSummary,
  slotGrid,
  slotShort,
  slotWarnings,
  toggleSlot,
  type GearKind,
  type SlotRules
} from '@atlas/core/gear';
import { FIELD, LABEL_FIELD, Segments } from '../systems/editor-parts.tsx';
import { Button } from '../parts/Button.tsx';
import { CELL_OFF, CELL_ON, slotKey } from './fleet-bits.tsx';
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
  // The rows shown: the wiki's maximum for this kind and class, at most 6 to start (an S-class ship's whole grid),
  // and never fewer than the marks need.
  // Until the player picks, it follows the class (a C-class tool upgraded to S grows).
  const [picked, setRows] = useState<number | null>(null);
  const rows = picked ?? Math.min(rules.maxRows, 6);
  const grid = slotGrid(slots, { rows: Math.min(rows, rules.maxRows), cols: rules.columns });
  const warn = slotWarnings(rules, slots);
  const summary = rulesSummary(rules, kind, cls, slots);
  const letter = classLetter(cls);
  const name = KINDS[kind].label;
  const pages = [...new Map(rules.sources.map(fact => [fact.path, fact.page])).entries()];
  const fixed = rules.fixed;
  const missing = fixed?.filter(slot => !slots.includes(slot)) ?? [];
  const keep = (next: string[]) => Object.fromEntries(Object.entries(labels).filter(([key]) => next.includes(key)));
  const [selected, setSelected] = useState<string | null>(slots[0] ?? null);
  const [moved, setFocus] = useState<[number, number]>([1, 1]);
  // Kept inside the grid: a lower class shrinks it, and the cell in the Tab order must still exist.
  const focus: [number, number] = [Math.min(moved[0], grid.rows), Math.min(moved[1], grid.cols)];
  const root = useRef<HTMLDivElement>(null);
  const rowOptions = Array.from(
    { length: Math.max(0, rules.maxRows - Math.min(MIN_ROWS, rules.maxRows) + 1) },
    (_, i) => Math.min(MIN_ROWS, rules.maxRows) + i
  ).filter(n => n <= 12);

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
    root.current?.querySelector<HTMLButtonElement>(`[data-slot="${slotKey(target[0], target[1])}"]`)?.focus();
  };
  const tap = (slot: string) => {
    const on = slots.includes(slot);
    if (on && selected !== slot) {
      setSelected(slot);
      return;
    }
    const next = toggleSlot(slots, slot);
    onChange(next, keep(next));
    setSelected(on ? null : slot);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p id="slotPickerLabel" className="text-caption text-ink-soft">
          Technology grid · tap slots to mark supercharged
        </p>
        <p className="font-mono text-caption text-ink-soft shrink-0" aria-live="polite">
          {rules.supercharged !== null ? `${String(slots.length)} / ${String(rules.supercharged)}` : slots.length}
          <span className="sr-only"> marked</span>
        </p>
      </div>
      <div
        ref={root}
        id="slotPicker"
        role="group"
        aria-labelledby="slotPickerLabel"
        aria-describedby="slotPickerHint"
        onKeyDown={onKey}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${String(grid.cols)}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: grid.rows * grid.cols }, (_, i) => {
          const row = Math.floor(i / grid.cols) + 1;
          const col = (i % grid.cols) + 1;
          const slot = slotKey(row, col);
          const on = grid.marked.has(slot);
          return (
            <button
              key={slot}
              type="button"
              data-slot={slot}
              aria-pressed={on}
              aria-label={`Row ${String(row)}, column ${String(col)}${on && labels[slot] ? `: ${labels[slot]}` : ''}`}
              tabIndex={row === focus[0] && col === focus[1] ? 0 : -1}
              onClick={() => {
                setFocus([row, col]);
                tap(slot);
              }}
              className={`aspect-square min-w-0 rounded-[6px] border grid place-items-center overflow-hidden transition-colors focus-visible:outline-2 focus-visible:outline-scanner-cyan-glow ${
                on ? CELL_ON : `${CELL_OFF} hover:border-control-edge-hover`
              } ${on && selected === slot ? 'outline-2 outline-offset-1 outline-scanner-cyan-glow' : ''}`}
            >
              {on && labels[slot] && (
                <span
                  className="text-[9px] font-semibold leading-none text-[#f3e8ff] truncate px-0.5"
                  aria-hidden="true"
                >
                  {slotShort(labels[slot])}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p id="slotPickerHint" className="sr-only">
        Mark the cells where the inventory shows a supercharged slot. Tap a marked one to select it, again to unmark it.
        Row 1 is the top row.
      </p>

      {summary && (
        <p id="slotRules" className="text-caption text-ink-soft flex items-start gap-1.5">
          <i
            className={`ph-bold mt-0.5 ${summary.status === 'off' ? 'ph-warning text-units-amber-text' : summary.status === 'match' ? 'ph-check text-ready-emerald-lit' : 'ph-info text-scanner-cyan-pale'}`}
            aria-hidden="true"
          />
          <span>
            {summary.status === 'match' ? 'Matches the wiki: ' : 'The wiki: '}
            {rules.supercharged !== null &&
              (kind === 'exosuit'
                ? `the Exosuit has ${String(rules.supercharged)}, in the same places for every player`
                : `${letter ?? ''}-class has ${String(rules.supercharged)}`)}
            {rules.supercharged !== null ? ', ' : ''}grid up to {rules.columns} × {rules.maxRows}. From{' '}
            {pages.map(([path, page], i) => (
              <span key={path}>
                {i > 0 && ', '}
                <a href={codexHref(path)} target="_blank" rel="noopener" className="text-scanner-cyan-pale underline">
                  {page}
                </a>
              </span>
            ))}
            .
          </span>
        </p>
      )}
      {(warn.tooMany || warn.outside.length > 0 || warn.offPreset.length > 0) && (
        <ul id="slotWarnings" className="flex flex-col gap-1 text-caption text-units-amber-text" aria-live="polite">
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
        <Button
          size="S"
          onClick={() => {
            const next = missing.reduce(toggleSlot, slots); // adds the missing ones; marks already there stay
            onChange(next, labels);
          }}
          className="self-start"
        >
          <span id="slotPreset">Mark the Exosuit’s slots ({list(missing)})</span>
        </Button>
      )}

      {rowOptions.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span aria-hidden="true" className="text-caption text-ink-soft">
            Rows
          </span>
          <div className="w-1/2">
            <Segments
              label="Rows"
              hideLabel
              value={String(grid.rows)}
              onChange={value => {
                setRows(Number(value) || grid.rows);
              }}
              options={rowOptions.map(n => [String(n), String(n)])}
            />
          </div>
        </div>
      )}

      {selected && slots.includes(selected) && (
        <section
          aria-labelledby="selectedSlotTitle"
          className="rounded-2xl border border-scanner-cyan-edge bg-panel p-3.5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-3">
            <h3
              id="selectedSlotTitle"
              className="text-[11px] font-bold uppercase tracking-[0.16em] text-scanner-cyan-pale"
            >
              Selected slot
            </h3>
            <span className="inline-flex items-center h-7 px-3 rounded-full border border-[rgba(192,132,252,0.5)] bg-[rgba(168,85,247,0.12)] text-[12px] font-semibold text-[#e9d5ff]">
              {selected} · supercharged
            </span>
          </div>
          <label className={LABEL_FIELD}>
            Module in this slot
            <input
              data-slot-label={selected}
              maxLength={MAX_LABEL}
              value={labels[selected] ?? ''}
              placeholder="e.g. Infra-Knife Accelerator"
              onChange={event => {
                onChange(slots, { ...labels, [selected]: event.target.value });
              }}
              className={FIELD}
            />
          </label>
          <Button
            wide
            onClick={() => {
              const next = toggleSlot(slots, selected);
              onChange(next, keep(next));
              setSelected(null);
            }}
          >
            Unmark supercharged
          </Button>
        </section>
      )}
    </div>
  );
}
