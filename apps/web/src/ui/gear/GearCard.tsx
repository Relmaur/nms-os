// One ship or Multi-Tool: name, class, type and role, its supercharged slots drawn on a grid, and its notes.
import { useMemo } from 'react';
import { slotGrid, type GearItem } from '@atlas/core/gear';
import { openGearEditor } from '../parts/editor-store.ts';
import { renderNote } from '../notes/NoteCard.tsx';

export const CLASS_COLOR: Record<string, string> = {
  S: 'text-amber-200 border-amber-400/50 bg-amber-400/10',
  A: 'text-purple-200 border-purple-400/50 bg-purple-400/10',
  B: 'text-cyan-200 border-cyan-400/50 bg-cyan-400/10',
  C: 'text-slate-200 border-slate-500/50 bg-slate-500/10'
};

export function ClassChip({ value }: { value: string }) {
  if (!value) return null;
  const color = CLASS_COLOR[value.trim().charAt(0).toUpperCase()] ?? CLASS_COLOR.C;
  return (
    <span
      className={`inline-flex items-center h-6 px-2 rounded-md border font-mono text-[11px] font-bold ${color ?? ''}`}
    >
      {value.length <= 2 ? `${value}-Class` : value}
    </span>
  );
}

export function SlotGrid({ slots }: { slots: string[] }) {
  const grid = slotGrid(slots);
  return (
    <div
      role="img"
      aria-label={`Supercharged slots: ${slots.join(', ')}`}
      className="inline-grid gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${String(grid.cols)}, 0.875rem)` }}
    >
      {Array.from({ length: grid.rows * grid.cols }, (_, i) => {
        const key = `R${String(Math.floor(i / grid.cols) + 1)}C${String((i % grid.cols) + 1)}`;
        return (
          <span
            key={key}
            className={`h-3.5 rounded-[3px] ${grid.marked.has(key) ? 'bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.6)]' : 'bg-slate-800'}`}
          />
        );
      })}
    </div>
  );
}

export function GearCard({ item }: { item: GearItem }) {
  const html = useMemo(() => renderNote(item.notes), [item.notes]);
  return (
    <article className="hud-card rounded-2xl p-4 sm:p-5 space-y-3" data-gear={item.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <h3 className="font-display font-bold text-base text-white break-words">{item.name}</h3>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
            <ClassChip value={item.class} />
            {item.type && <span>{item.type}</span>}
            {item.role && (
              <span className="inline-flex items-center h-6 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                {item.role}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            openGearEditor(item.id);
          }}
          aria-label={`Edit ${item.name}`}
          className="shrink-0 h-9 px-3 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white hover:bg-slate-900 flex items-center gap-1.5"
        >
          <i className="ph-bold ph-pencil-simple" aria-hidden="true" />
          Edit
        </button>
      </div>
      {item.superchargedSlots.length > 0 && (
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <SlotGrid slots={item.superchargedSlots} />
          <p className="text-[11px] font-mono text-amber-200/90">{item.superchargedSlots.join(' · ')}</p>
        </div>
      )}
      {item.notes.trim() && <div className="md-body text-sm" dangerouslySetInnerHTML={{ __html: html }} />}
    </article>
  );
}
