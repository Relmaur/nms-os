// Outlaw Run: systems tagged "outlaw", which Contraband Agents have restocked, and the next stations to hit.
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { formatAgo, formatDuration } from '@atlas/core/format';
import { OUTLAW_LIMITS, outlawSummary } from '@atlas/core/outlaw';
import { parseOutlawList } from '@atlas/core/systems-list';
import { packetsLogged } from '@atlas/core/systems-model';
import type { OutlawSettings } from '@atlas/core/state';
import { addOutlawSystems, logOutlawRun, logPacketRun, setOutlawSetting, undoPacketRun } from '../actions.ts';
import { useAppState } from '../useAppState.ts';
import { useNow } from '../useNow.ts';
import { GlyphChip, OutlawPill } from '../parts/SystemBits.tsx';
import { openSystem, openSystemEditor } from '../systems/panel-store.ts';

type StationFilter = 'all' | 'ready' | 'wait';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const where = (system: { region: string; galaxy: string }) =>
  [system.region, system.galaxy].filter(Boolean).join(' · ');

export function Outlaw() {
  const state = useAppState();
  const now = useNow();
  const { outlaw } = state;
  const summary = outlawSummary(state, now);
  const { rows, ready, run } = summary;
  const [bulkOpen, setBulkOpen] = useState(false);
  const [stationFilter, setStationFilter] = useState<StationFilter>('all');
  const filters: [StationFilter, string, number][] = [
    ['all', 'All', rows.length],
    ['ready', 'Ready', ready.length],
    ['wait', 'Restocking', rows.length - ready.length]
  ];
  const visible = rows.filter(row => stationFilter === 'all' || (stationFilter === 'ready') === row.status.ready);

  return (
    <>
      <div className="hud-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-white">Outlaw Run</h2>
            <p className="text-sm text-slate-300 mt-1.5">
              Your outlaw systems, which Contraband Agents have restocked, and the next stations to hit. Method:{' '}
              <a href="#book2" className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2">
                Book II · Two-Vendor Loop
              </a>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setBulkOpen(true);
              }}
              className="h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-sm text-slate-200 flex items-center gap-2"
            >
              <i className="ph-bold ph-list-plus" /> Paste a list
            </button>
            <button
              type="button"
              onClick={() => {
                openSystemEditor(null, { tags: ['outlaw'], conflict: 'pirate' });
              }}
              className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition"
            >
              <i className="ph-bold ph-plus" /> Add outlaw system
            </button>
          </div>
        </div>
        <p id="outlawSummary" className="text-sm text-slate-300">
          {rows.length ? (
            <>
              <strong className="text-white">{rows.length}</strong>
              {` outlaw system${rows.length === 1 ? '' : 's'} · `}
              <strong className="text-emerald-300">{`${ready.length} ready`}</strong>
              {` · ${plural(summary.runs, 'packet run')} · ~${summary.nanitesEarned.toLocaleString()} Nanites earned so far`}
            </>
          ) : (
            'No outlaw systems yet. Add the ones you use (10–20 makes a good rotation). They’re regular systems tagged “outlaw”, so they also show up under Systems.'
          )}
        </p>
        <BulkForm
          open={bulkOpen}
          onClose={() => {
            setBulkOpen(false);
          }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 hud-card rounded-2xl p-5 space-y-4 self-start">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display font-bold text-base text-white">Next run</h3>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              Stations
              <select
                id="outlawRunSize"
                value={outlaw.runSize}
                onChange={event => {
                  setOutlawSetting('runSize', event.target.value);
                }}
                className="h-9 bg-slate-900 border border-slate-700 rounded-lg px-2 text-sm text-white"
              >
                {Array.from({ length: OUTLAW_LIMITS.runSize[1] }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ol id="outlawRunList" className="space-y-2">
            {run.length ? (
              run.map(({ system }, i) => (
                <li
                  key={system.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800"
                >
                  <span className="nav-tile text-emerald-300 mt-0.5">{i + 1}</span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        openSystem(system.id);
                      }}
                      className="block max-w-full text-left"
                    >
                      <span className="block text-sm font-semibold text-white truncate hover:underline underline-offset-2">
                        {system.name}
                      </span>
                      <span className="block text-xs text-slate-400 truncate">{where(system)}</span>
                    </button>
                    <GlyphChip glyphs={system.glyphs} />
                  </div>
                  <VisitedButton id={system.id} size="h-9 px-3 gap-1.5" />
                </li>
              ))
            ) : (
              <li className="p-4 rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">
                {rows[0]
                  ? `Every station is restocking. Next one ready in ${formatDuration(rows[0].status.readyAt - now)} (${rows[0].system.name}).`
                  : 'Add outlaw systems to plan a run.'}
              </li>
            )}
          </ol>
          <div id="outlawRunFooter">
            {run.length ? (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-300">
                  {`${plural(run.length, 'station')} · ${summary.runPackets} packets · ~${(summary.runUnits / 1e6).toFixed(1)}M Units → `}
                  <strong className="text-emerald-300">~{summary.runNanites.toLocaleString()} Nanites</strong>
                </p>
                {run.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      logOutlawRun(run.map(row => row.system));
                    }}
                    className="h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-200"
                  >
                    Mark whole run visited
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="xl:col-span-7 hud-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display font-bold text-base text-white">Outlaw systems</h3>
            <div id="outlawFilters" className="flex gap-1.5">
              {filters.map(([key, label, n]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setStationFilter(key);
                  }}
                  aria-pressed={stationFilter === key}
                  className={`h-8 px-3 rounded-full border text-xs font-medium transition ${stationFilter === key ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'}`}
                >
                  {`${label} `}
                  <span className="font-mono opacity-70">{n}</span>
                </button>
              ))}
            </div>
          </div>
          <ul id="outlawStationList" className="space-y-2">
            {visible.length ? (
              visible.map(({ system, status }) => {
                const runVisits = system.visits.filter(visit => visit.packets);
                const last = runVisits.at(-1);
                return (
                  <li key={system.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          openSystem(system.id);
                        }}
                        className="min-w-0 text-left"
                      >
                        <strong className="text-sm text-white hover:underline underline-offset-2">{system.name}</strong>{' '}
                        <span className="block text-xs text-slate-400">{where(system)}</span>
                      </button>
                      <OutlawPill status={status} />
                    </div>
                    {system.glyphs || system.notes ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <GlyphChip glyphs={system.glyphs} />
                        {system.notes ? (
                          <span className="text-xs text-slate-300 line-clamp-1">{system.notes.split('\n')[0]}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-slate-400">
                        {last
                          ? `${plural(runVisits.length, 'run')} · last ${formatAgo(last.at, now)} · ~${(packetsLogged(system) * outlaw.nanitesPerPacket).toLocaleString()} Nanites`
                          : 'No packet runs yet'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <VisitedButton id={system.id} size="h-8 px-2.5 gap-1" />
                        {last ? (
                          <button
                            type="button"
                            onClick={() => {
                              undoPacketRun(system.id);
                            }}
                            title="Undo last run"
                            aria-label={`Undo last run at ${system.name}`}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
                          >
                            <i className="ph-bold ph-arrow-counter-clockwise" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            openSystem(system.id);
                          }}
                          title="Open system"
                          aria-label={`Open ${system.name}`}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
                        >
                          <i className="ph-bold ph-arrow-right" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="p-4 rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">
                {rows.length
                  ? 'No stations in this view.'
                  : 'Your outlaw list is empty. Use “Add outlaw system”, or paste a whole list at once.'}
              </li>
            )}
          </ul>
          <details className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-300">
            <summary className="cursor-pointer text-sm font-medium text-slate-200">Run settings</summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Setting
                id="outlawRestockHours"
                setting="restockHours"
                value={outlaw.restockHours}
                step={1}
                label="Restock timer (hours)"
                hint="How long after a packet run a station counts as restocked. Set it to what you see in-game."
              />
              <Setting
                id="outlawPacketsPerVisit"
                setting="packetsPerVisit"
                value={outlaw.packetsPerVisit}
                step={1}
                label="Packets bought per visit"
                hint="Multiplies the two estimates below."
              />
              <Setting
                id="outlawUnitsPerPacket"
                setting="unitsPerPacket"
                value={outlaw.unitsPerPacket}
                step={1000}
                label="Units you pay per packet"
                hint="Your average at Contraband Agents. The price isn’t fixed game data, so set it from what you see."
              />
              <Setting
                id="outlawNanitesPerPacket"
                setting="nanitesPerPacket"
                value={outlaw.nanitesPerPacket}
                step={10}
                label="Nanites you get per packet"
                hint="Your average after opening and scrapping. Packet contents are random, so this is an estimate."
              />
            </div>
          </details>
        </div>
      </div>
    </>
  );
}

function VisitedButton({ id, size }: { id: string; size: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        logPacketRun(id);
      }}
      className={`shrink-0 ${size} rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 text-xs font-semibold flex items-center`}
    >
      <i className="ph-bold ph-check" />
      Visited
    </button>
  );
}

// A number the player sets from what they see in-game. It's kept on blur or Enter (as a native change event would),
// so a value is never clamped halfway through typing it.
function Setting({
  id,
  setting,
  value,
  step,
  label,
  hint
}: {
  id: string;
  setting: keyof OutlawSettings;
  value: number;
  step: number;
  label: string;
  hint: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [min, max] = OUTLAW_LIMITS[setting];
  // Another tab (or an import) changed it: show the new value, unless the person is typing here.
  useEffect(() => {
    if (input.current && document.activeElement !== input.current) input.current.value = String(value);
  }, [value]);
  const commit = () => {
    if (input.current) input.current.value = String(setOutlawSetting(setting, input.current.value));
  };
  return (
    <label className="block">
      {label}
      <input
        ref={input}
        id={id}
        type="number"
        min={min}
        max={setting === 'unitsPerPacket' || setting === 'nanitesPerPacket' ? undefined : max}
        step={step}
        defaultValue={value}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === 'Enter') commit();
        }}
        className="mt-1 w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-base sm:text-sm text-white"
      />
      <span className="block mt-1 text-slate-400">{hint}</span>
    </label>
  );
}

function BulkForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [error, setError] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) textarea.current?.focus();
  }, [open]);
  const close = () => {
    setError('');
    onClose();
  };
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = parseOutlawList(textarea.current?.value ?? '');
    if ('error' in result) {
      setError(result.error);
      return;
    }
    if (textarea.current) textarea.current.value = '';
    close();
    addOutlawSystems(result.systems);
  };
  return (
    <form
      id="outlawBulkForm"
      className={`${open ? '' : 'hidden '}rounded-xl bg-slate-900/70 border border-slate-700 p-4 space-y-3`}
      onSubmit={submit}
    >
      <label className="block text-xs text-slate-300">
        One system per line: <code className="text-emerald-300">System | Glyphs | Region | Notes</code> (only the name
        is required)
        <textarea
          ref={textarea}
          id="outlawBulkInput"
          rows={7}
          placeholder={
            'Okyama XI | 0123456789AB | Ezdaranit Spur | 2 jumps from base\nIvorsk\nHesperus Prime | 1A2B3C4D5E6F'
          }
          className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base sm:text-sm font-mono text-white"
        />
      </label>
      <p id="outlawBulkError" role="alert" className={`${error ? '' : 'hidden '}text-xs text-rose-300`}>
        {error}
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="h-9 px-3.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-9 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold"
        >
          Add systems
        </button>
      </div>
    </form>
  );
}
