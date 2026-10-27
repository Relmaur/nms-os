// Ships & Multi-Tools: the player's own gear (state key `gear`, ADR-0007), with their supercharged slots and notes.
import { gearOrder, type GearKind } from '@atlas/core/gear';
import { useAppState } from '../useAppState.ts';
import { openGearEditor } from '../parts/editor-store.ts';
import { GearCard } from './GearCard.tsx';

const GROUPS: [GearKind, string, string][] = [
  ['starship', 'Starships', 'ph-rocket'],
  ['multitool', 'Multi-Tools', 'ph-crosshair']
];

export function Gear() {
  const gear = gearOrder(useAppState().gear);
  return (
    <>
      <div className="hud-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl font-bold text-white">Ships & Multi-Tools</h1>
            <p className="text-sm text-slate-300 mt-1.5">
              Your gear, with its class, supercharged slots and layout notes. The ones you mark Flagship lead on Home.
            </p>
          </div>
        </div>
      </div>
      {GROUPS.map(([kind, title, icon]) => {
        const items = gear.filter(item => item.kind === kind);
        return (
          <section key={kind} aria-labelledby={`gear-${kind}`} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id={`gear-${kind}`} className="font-display font-bold text-base text-white flex items-center gap-2">
                <i className={`ph-bold ${icon} text-cyan-300`} aria-hidden="true" />
                {title}
                <span className="text-xs font-mono text-slate-400">{items.length}</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  openGearEditor(null, kind);
                }}
                className="h-9 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5"
              >
                <i className="ph-bold ph-plus" aria-hidden="true" />
                {kind === 'starship' ? 'Add starship' : 'Add Multi-Tool'}
              </button>
            </div>
            {items.length ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map(item => (
                  <GearCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 border border-dashed border-slate-700 rounded-2xl px-4 py-3">
                {kind === 'starship'
                  ? 'No starships yet. Add the one you fly: its slots and layout stay with it.'
                  : 'No Multi-Tools yet. Add yours to keep its supercharged layout at hand.'}
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
