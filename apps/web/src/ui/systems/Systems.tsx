// The Systems log: every system warped to, searchable and filterable the way the in-game Discoveries page isn't.
import { formatAgo } from '@atlas/core/format';
import {
  DEFAULT_FILTER,
  filterActive,
  filterSystems,
  systemMeta,
  systemsSummary,
  tagCounts,
  type SystemFilter
} from '@atlas/core/systems-list';
import {
  CONFLICT_LEVELS,
  OUTLAW_TAG,
  RACES,
  SORTS,
  STAR_CLASSES,
  lastVisit,
  outlawStatus,
  type System
} from '@atlas/core/systems-model';
import { useAppState } from '../useAppState.ts';
import { useNow } from '../useNow.ts';
import { MetaLine, OutlawPill, StarDot, TagChip } from '../parts/SystemBits.tsx';
import { openSystem, openSystemEditor, setSystemFilter, useSystemFilter } from './panel-store.ts';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function Systems() {
  const state = useAppState();
  const now = useNow();
  const filter = useSystemFilter();
  const systems = state.systems;
  const visible = filterSystems(systems, filter);
  const summary = systemsSummary(systems);
  const tags = tagCounts(systems);

  return (
    <>
      <div className="hud-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-white">Systems</h2>
            <p className="text-sm text-slate-300 mt-1.5">
              Every system you warp to, with the details the game shows, your own tags, planets, notes and a visit
              journal. Filter it the way the in-game Discoveries page can’t.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              openSystemEditor();
            }}
            className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition"
          >
            <i className="ph-bold ph-plus" /> Add system
          </button>
        </div>
        <p id="systemsSummary" className="text-sm text-slate-300">
          {systems.length ? (
            <>
              <strong className="text-white">{systems.length}</strong>
              {` system${systems.length === 1 ? '' : 's'} · ${plural(summary.planets, 'planet')} · ${plural(summary.visits, 'visit')} logged`}
            </>
          ) : (
            'Nothing logged yet. Warp somewhere and add it. Only the name is required; fill in the rest whenever you like.'
          )}
        </p>
      </div>

      <div className="hud-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              id="systemSearch"
              autoComplete="off"
              value={filter.q}
              onChange={event => {
                setSystemFilter({ q: event.target.value });
              }}
              placeholder="Search systems, planets, notes, tags…"
              aria-label="Search systems"
              className="w-full h-10 bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl pl-9 pr-3 text-base md:text-sm text-white placeholder:text-slate-500 focus:outline-hidden"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              id="systemFavFilter"
              onClick={() => {
                setSystemFilter({ favorites: !filter.favorites });
              }}
              aria-pressed={filter.favorites}
              className="seg-filter h-10"
            >
              <i className="ph-bold ph-star" />
              Favourites
            </button>
            <FilterSelect
              id="systemStarFilter"
              label="Star colour"
              any="Any star"
              value={filter.star}
              options={Object.entries(STAR_CLASSES).map(([key, star]) => [key, star.label])}
              onChange={star => {
                setSystemFilter({ star: star as SystemFilter['star'] });
              }}
            />
            <FilterSelect
              id="systemRaceFilter"
              label="Dominant race"
              any="Any race"
              value={filter.race}
              options={Object.entries(RACES)}
              onChange={race => {
                setSystemFilter({ race: race as SystemFilter['race'] });
              }}
            />
            <FilterSelect
              id="systemConflictFilter"
              label="Conflict level"
              any="Any conflict"
              value={filter.conflict}
              options={Object.entries(CONFLICT_LEVELS)}
              onChange={conflict => {
                setSystemFilter({ conflict: conflict as SystemFilter['conflict'] });
              }}
            />
            <select
              id="systemSort"
              value={filter.sort}
              onChange={event => {
                setSystemFilter({ sort: event.target.value as SystemFilter['sort'] });
              }}
              aria-label="Sort"
              className="filter-select col-span-2 sm:col-span-1"
            >
              {Object.entries(SORTS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div id="systemTagFilters" className="flex flex-wrap gap-1.5">
          {tags.length ? (
            tags.map(([tag, n]) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSystemFilter({
                    tags: filter.tags.includes(tag) ? filter.tags.filter(item => item !== tag) : [...filter.tags, tag]
                  });
                }}
                aria-pressed={filter.tags.includes(tag)}
                className="tag-filter"
              >
                {`${tag} `}
                <span className="font-mono opacity-60">{n}</span>
              </button>
            ))
          ) : (
            <span className="text-xs text-slate-400">Tags you add to systems and planets show up here as filters.</span>
          )}
        </div>
        <p id="systemResultCount" className="text-xs text-slate-400">
          {`${visible.length} of ${systems.length}${filterActive(filter) ? ' · ' : ''}`}
          {filterActive(filter) ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setSystemFilter({ ...DEFAULT_FILTER, sort: filter.sort });
                }}
                className="text-emerald-300 hover:text-emerald-200"
              >
                Clear filters
              </button>
            </>
          ) : null}
        </p>
        <ul id="systemList" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.length ? (
            visible.map(system => (
              <SystemCard key={system.id} system={system} now={now} restockHours={state.outlaw.restockHours} />
            ))
          ) : (
            <li className="sm:col-span-2 p-6 rounded-xl border border-dashed border-slate-700 text-center text-sm text-slate-400">
              {systems.length
                ? 'No systems match these filters.'
                : 'Your atlas is empty. Use “Add system” after your next warp.'}
            </li>
          )}
        </ul>
      </div>
    </>
  );
}

function FilterSelect({
  id,
  label,
  any,
  value,
  options,
  onChange
}: {
  id: string;
  label: string;
  any: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={event => {
        onChange(event.target.value);
      }}
      aria-label={label}
      className="filter-select"
    >
      <option value="">{any}</option>
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  );
}

function SystemCard({ system, now, restockHours }: { system: System; now: number; restockHours: number }) {
  const last = lastVisit(system);
  const meta = systemMeta(system);
  const status = system.tags.includes(OUTLAW_TAG) ? outlawStatus(system, restockHours, now) : null;
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          openSystem(system.id);
        }}
        className="system-card w-full h-full text-left p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-600 transition space-y-2.5"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="flex items-center gap-2.5 min-w-0">
            <StarDot system={system} />
            <strong className="text-[0.9375rem] text-white truncate">{system.name}</strong>
            {system.favorite ? <i className="ph-fill ph-star text-amber-300 shrink-0" title="Favourite" /> : null}
          </span>
          {status ? (
            <OutlawPill status={status} />
          ) : system.rating ? (
            <span className="text-xs text-amber-300 shrink-0" title={`Rating ${system.rating}/5`}>
              {'★'.repeat(system.rating)}
            </span>
          ) : null}
        </span>
        {meta.length ? (
          <span className="block text-xs text-slate-400">
            <MetaLine parts={meta} />
          </span>
        ) : null}
        {system.tags.length ? (
          <span className="flex flex-wrap gap-1">
            {system.tags.slice(0, 6).map(tag => (
              <TagChip key={tag} tag={tag} />
            ))}
            {system.tags.length > 6 ? (
              <span className="text-[11px] text-slate-400 self-center">+{system.tags.length - 6}</span>
            ) : null}
          </span>
        ) : null}
        {system.notes ? <span className="block text-xs text-slate-300 line-clamp-2">{system.notes}</span> : null}
        <span className="block text-[11px] text-slate-400">
          {(last
            ? `Last visit ${formatAgo(last.at, now)} · ${plural(system.visits.length, 'visit')}`
            : 'No visits logged') + (system.planets.length ? ` · ${plural(system.planets.length, 'planet')}` : '')}
        </span>
      </button>
    </li>
  );
}
