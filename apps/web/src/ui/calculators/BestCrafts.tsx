// Best crafts: what to craft for money, ranked by the value it gains over what its raw materials would sell for
// (@atlas/core/profit, on the planner's own build order). "Plan it" hands an item to the recipe planner.
import { useMemo, useState } from 'react';
import { formatUnits } from '@atlas/core/calc';
import { rankCrafts, sortCrafts, type CraftSort } from '@atlas/core/profit';
import type { Catalog } from '@atlas/core/planner';
import { planItem } from './tool-store.ts';

const PAGE = 15;
const CATEGORIES: [string, string][] = [
  ['', 'Everything'],
  ['products', 'Products'],
  ['cooking', 'Cooking']
];
const STEPS: [number, string][] = [
  [0, 'Any length'],
  [3, 'Up to 3 steps'],
  [6, 'Up to 6 steps']
];

export function BestCrafts({ catalog }: { catalog: Catalog }) {
  const ranked = useMemo(() => rankCrafts(catalog), [catalog]);
  const [sort, setSort] = useState<CraftSort>('gain');
  const [category, setCategory] = useState('');
  const [maxSteps, setMaxSteps] = useState(0);
  const [shown, setShown] = useState(PAGE);
  const crafts = useMemo(
    () => sortCrafts(ranked.crafts, { sort, ...(category ? { category } : {}), ...(maxSteps ? { maxSteps } : {}) }),
    [ranked, sort, category, maxSteps]
  );
  const reset = () => {
    setShown(PAGE);
  };

  return (
    <div className="hud-card rounded-2xl p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
          <i className="ph-bold ph-trend-up text-cyan-300" aria-hidden="true" />
          Best crafts
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          What gains the most over selling its raw materials instead, at the wiki’s base values. Terminals pay more or
          less depending on the system’s economy.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Rank by">
        {(
          [
            ['gain', 'Most gained'],
            ['per-step', 'Per crafting step']
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={sort === key}
            onClick={() => {
              setSort(key);
              reset();
            }}
            className={`seg ${sort === key ? 'is-on' : ''}`}
          >
            {label}
          </button>
        ))}
        <label className="sr-only" htmlFor="craftCategory">
          Category
        </label>
        <select
          id="craftCategory"
          value={category}
          onChange={event => {
            setCategory(event.target.value);
            reset();
          }}
          className="filter-select"
        >
          {CATEGORIES.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="craftSteps">
          Length
        </label>
        <select
          id="craftSteps"
          value={maxSteps}
          onChange={event => {
            setMaxSteps(Number(event.target.value));
            reset();
          }}
          className="filter-select"
        >
          {STEPS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <ol id="craftList" className="space-y-2">
        {crafts.slice(0, shown).map((craft, i) => (
          <li
            key={craft.item.title}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-start gap-3"
            data-craft={craft.item.title}
          >
            <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-xs text-slate-500">{i + 1}</span>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <a
                  href={`wiki/#/a/${encodeURIComponent(craft.item.path)}`}
                  className="font-medium text-white underline decoration-slate-600 underline-offset-[3px] hover:text-cyan-200"
                >
                  {craft.makes > 1 ? `${String(craft.makes)} × ${craft.item.title}` : craft.item.title}
                </a>
                {craft.blueprint && (
                  <span className="text-[11px] font-mono uppercase tracking-wide text-purple-300">blueprint</span>
                )}
              </p>
              <p className="font-mono tabular-nums text-xs text-slate-300">
                <span className={craft.gain >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                  {craft.gain >= 0 ? '+' : '−'}
                  {formatUnits(Math.abs(craft.gain))}
                </span>
                {craft.multiplier !== null && (
                  <span className="text-slate-400"> · ×{formatMultiplier(craft.multiplier)}</span>
                )}
                <span className="text-slate-400">
                  {' '}
                  · {craft.steps} step{craft.steps === 1 ? '' : 's'}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Sells for {formatUnits(craft.value)}; its raw materials for {formatUnits(craft.rawValue)}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                planItem(craft.item.title);
              }}
              aria-label={`Plan it: ${craft.item.title}`}
              className="shrink-0 h-9 px-3 rounded-lg border border-slate-700 text-xs text-slate-200 hover:text-white hover:border-slate-500 flex items-center gap-1.5"
            >
              <i className="ph-bold ph-stack" aria-hidden="true" />
              Plan it
            </button>
          </li>
        ))}
      </ol>
      {!crafts.length && <p className="text-sm text-slate-400">Nothing matches these filters.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          {crafts.length.toLocaleString()} crafts ranked
          {ranked.skipped ? `; ${String(ranked.skipped)} left out, a raw material has no wiki value` : ''}.
        </span>
        {shown < crafts.length && (
          <button
            type="button"
            onClick={() => {
              setShown(shown + PAGE);
            }}
            className="h-9 px-3 rounded-lg border border-dashed border-slate-600 text-slate-300 hover:text-white"
          >
            Show more
          </button>
        )}
      </div>
    </div>
  );
}

const formatMultiplier = (n: number) => (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(n >= 10 ? 0 : 1));
