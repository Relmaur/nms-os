// Best crafts (design 14), its own screen at #crafts: what to craft for money, ranked by the Units it gains over what
// its raw materials would sell for (@atlas/core/profit, on the planner's own build order). Chips rank by profit,
// multiplier or fewest steps, and leave out crafts that need a crop. A row opens the item in the recipe planner.
import { LoadFailed, RowsLoading } from '../parts/Loading.tsx';
import { useMemo, useState } from 'react';
import { rankCrafts, sortCrafts, type CraftSort, type RankedCraft } from '@atlas/core/profit';
import { goBack, useSection } from '../shell/section-store.ts';
import { loadGameData, useGameData } from './game-data.ts';

const PAGE = 15;
const SORTS: [CraftSort, string][] = [
  ['gain', 'Profit'],
  ['multiplier', 'Multiplier'],
  ['steps', 'Fewest steps']
];
const TOP_BUTTON =
  'w-11 h-11 rounded-control bg-slate-ground border border-control-edge grid place-items-center text-ink hover:border-control-edge-hover';
const CHIP = (on: boolean) =>
  `relative shrink-0 h-[34px] px-3.5 rounded-full border text-[13px] font-semibold whitespace-nowrap ${
    on
      ? 'bg-scanner-cyan-tint border-scanner-cyan-edge text-scanner-cyan-text'
      : 'bg-slate-ground border-control-edge text-ink-soft hover:text-ink-bright'
  }`;
const planHref = (craft: RankedCraft) => `#plan/${encodeURIComponent(craft.item.title)}`;
const multiplier = (craft: RankedCraft) => (craft.multiplier === null ? '' : `×${craft.multiplier.toFixed(1)}`);
const stepsLine = (craft: RankedCraft) =>
  [`${String(craft.steps)} step${craft.steps === 1 ? '' : 's'}`, craft.blueprint ? 'blueprint' : '']
    .filter(Boolean)
    .join(' · ');

export function BestCrafts() {
  const section = useSection();
  const data = useGameData();
  if (section !== 'crafts') return null;
  return (
    <div className="flex flex-col gap-4 max-w-2xl pt-[env(safe-area-inset-top)]">
      <header className="flex flex-col gap-1.5">
        <div>
          <button
            type="button"
            onClick={() => {
              goBack('calculators');
            }}
            aria-label="Back"
            className={TOP_BUTTON}
          >
            <i className="ph-bold ph-caret-left text-lg" aria-hidden="true" />
          </button>
        </div>
        <h1 className="font-display text-screen-title text-ink-bright mt-4">Best crafts</h1>
        <p className="text-sub text-ink-muted">Ranked by Units gained over the raw materials they eat.</p>
      </header>
      {data.status === 'ready' ? (
        <Ranking catalog={data.catalog} />
      ) : data.status === 'failed' ? (
        <LoadFailed what="The recipe data" onRetry={() => void loadGameData()} />
      ) : (
        <RowsLoading label="Loading recipes" rows={6} />
      )}
    </div>
  );
}

function Ranking({ catalog }: { catalog: Parameters<typeof rankCrafts>[0] }) {
  const ranked = useMemo(() => rankCrafts(catalog), [catalog]);
  const [sort, setSort] = useState<CraftSort>('gain');
  const [noFarming, setNoFarming] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const crafts = useMemo(() => sortCrafts(ranked.crafts, { sort, noFarming }), [ranked, sort, noFarming]);
  const top = crafts[0];

  return (
    <>
      <div
        role="group"
        aria-label="Rank by"
        className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:mx-0 lg:px-0"
      >
        {SORTS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={sort === key}
            onClick={() => {
              setSort(key);
              setShown(PAGE);
            }}
            className={CHIP(sort === key)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={noFarming}
          onClick={() => {
            setNoFarming(!noFarming);
            setShown(PAGE);
          }}
          className={CHIP(noFarming)}
        >
          No farming
        </button>
      </div>

      {top && (
        <a
          id="craftTop"
          href={planHref(top)}
          className="rounded-card bg-panel-glass border border-[rgba(251,191,36,0.35)] p-4 flex items-center gap-3.5 hover:border-[rgba(251,191,36,0.6)]"
        >
          <span
            aria-hidden="true"
            className="w-11 h-11 shrink-0 rounded-[12px] grid place-items-center bg-[rgba(245,158,11,0.12)] border border-[rgba(251,191,36,0.45)] text-units-amber-text"
          >
            <i className="ph-bold ph-trophy text-xl" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-label uppercase text-ink-label">Top pick</span>
            <span className="block font-display font-bold text-[15px] text-ink-bright truncate mt-0.5">
              {top.item.title}
            </span>
          </span>
          <span className="font-mono text-[16px] font-semibold text-units-amber-text">{multiplier(top)}</span>
        </a>
      )}

      {crafts.length > 0 ? (
        <ol
          id="craftList"
          className="rounded-card bg-panel-glass border border-hairline divide-y divide-hairline overflow-hidden"
        >
          {crafts.slice(0, shown).map((craft, i) => (
            <li key={craft.item.title} data-craft={craft.item.title}>
              <a
                href={planHref(craft)}
                className="flex items-center gap-3 min-h-[52px] px-4 py-2.5 hover:bg-slate-ground"
              >
                <span aria-hidden="true" className="w-[22px] shrink-0 font-mono text-[13px] text-ink-label">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[14px] font-semibold text-ink-bright truncate">
                    {craft.makes > 1 ? `${String(craft.makes)} × ${craft.item.title}` : craft.item.title}
                  </span>
                  <span className="text-caption text-ink-muted">{stepsLine(craft)}</span>
                </span>
                <span className="flex flex-col items-end gap-0.5 shrink-0">
                  <span
                    className={`font-mono text-[14px] font-semibold ${craft.gain >= 0 ? 'text-units-amber-text' : 'text-danger-rose-text'}`}
                  >
                    {craft.gain >= 0 ? '+' : '−'}
                    {Math.abs(craft.gain).toLocaleString()}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">{multiplier(craft)}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sub text-ink-muted">Nothing left once crops are left out.</p>
      )}
      {shown < crafts.length && (
        <button
          type="button"
          onClick={() => {
            setShown(shown + PAGE);
          }}
          className="self-center h-10 px-4 rounded-control border border-dashed border-control-edge text-sub text-ink-soft hover:text-ink-bright"
        >
          Show more
        </button>
      )}
      <p className="text-center text-caption text-ink-muted">
        <span className="font-mono">{crafts.length.toLocaleString()}</span> crafts ranked · values from the NMS wiki
      </p>
      <p className="text-center text-caption text-ink-label">
        Base values: a trade terminal pays more or less with the system’s economy.
        {ranked.skipped ? ` ${String(ranked.skipped)} left out: a raw material has no value on the wiki.` : ''}
        {noFarming
          ? ' No farming leaves out crafts that need a crop (the wiki’s harvested agricultural substances).'
          : ''}
      </p>
    </>
  );
}
