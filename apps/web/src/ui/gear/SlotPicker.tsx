// Mark supercharged slots by tapping the inventory grid: tap to mark, tap again to clear. Each cell is a toggle button;
// one is in the Tab order at a time, and the arrow keys move between them (Space or Enter toggles), so 40 cells
// don't cost 40 Tab presses.
import { useRef, useState, type KeyboardEvent } from 'react';
import { slotGrid, toggleSlot } from '@atlas/core/gear';

const MIN = { rows: 4, cols: 10 };
const STEP: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1]
};

export function SlotPicker({ slots, onChange }: { slots: string[]; onChange: (slots: string[]) => void }) {
  const grid = slotGrid(slots, MIN);
  const [focus, setFocus] = useState<[number, number]>([1, 1]);
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
                onChange(toggleSlot(slots, slot));
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
      <p id="slotPickerHint" className="text-xs text-slate-400">
        Tap the cells where the inventory shows a supercharged slot; tap again to clear. Row 1 is the top row.
      </p>
    </div>
  );
}
