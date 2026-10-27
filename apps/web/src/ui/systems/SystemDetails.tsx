// A system in the panel: quick visit logging, rating, tags, notes (autosaved), facts, planets, the visit journal.
import { useCallback, useEffect, useRef, useState, type SubmitEvent, type ReactNode } from 'react';
import { formatAgo, formatDate } from '@atlas/core/format';
import { systemMeta } from '@atlas/core/systems-list';
import {
  CONFLICT_LEVELS,
  OUTLAW_TAG,
  RACES,
  STAR_CLASSES,
  outlawStatus,
  type Planet,
  type System
} from '@atlas/core/systems-model';
import { appState, onAdopt, persistState } from '../../app/store.ts';
import {
  deletePlanet,
  deleteSystem,
  deleteVisit,
  logVisit,
  saveNotes,
  savePlanet,
  setRating,
  toggleFavorite
} from '../actions.ts';
import { useNow } from '../useNow.ts';
import { GlyphChip, MetaLine, OutlawPill, StarDot, TagChip, WealthStars } from '../parts/SystemBits.tsx';
import { closeSystemPanel, dismissSystemPanel, filterByTag, openSystemEditor } from './panel-store.ts';
import { SheetGrab } from '../parts/Sheet.tsx';

const ICON_BUTTON = 'w-9 h-9 rounded-xl flex items-center justify-center';
const ARMED = 'px-2 text-xs font-semibold text-rose-200 bg-rose-500/15 border border-rose-500/50';

// Deletes take two taps: the first arms the button ("Delete?") for a few seconds.
function useArmedDelete(): [string | null, (key: string) => boolean] {
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    []
  );
  const confirm = useCallback(
    (key: string) => {
      clearTimeout(timer.current);
      if (armed === key) {
        setArmed(null);
        return true;
      }
      setArmed(key);
      timer.current = setTimeout(() => {
        setArmed(null);
      }, 4000);
      return false;
    },
    [armed]
  );
  return [armed, confirm];
}

export function SystemDetails({ system, open }: { system: System; open: boolean }) {
  const now = useNow();
  const [armed, confirmDelete] = useArmedDelete();
  const [editingPlanet, setEditingPlanet] = useState<string | null>(null); // a planet id, or 'new'
  const outlaw = system.tags.includes(OUTLAW_TAG);
  const status = outlaw ? outlawStatus(system, appState.outlaw.restockHours, now) : null;
  const meta = systemMeta(system);
  const facts: [string, ReactNode][] = [
    ['Galaxy', system.galaxy],
    ['Region', system.region],
    ['Portal glyphs', system.glyphs ? <GlyphChip glyphs={system.glyphs} /> : null],
    [
      'Star',
      system.star ? (
        <span className="inline-flex items-center gap-2">
          <StarDot system={system} />
          {STAR_CLASSES[system.star].label}
        </span>
      ) : null
    ],
    ['Dominant race', system.race ? RACES[system.race] : null],
    [
      'Economy',
      system.economy || system.wealth ? (
        <>
          {system.economy}
          {system.economy && system.wealth ? ' ' : null}
          <WealthStars wealth={system.wealth} />
        </>
      ) : null
    ],
    ['Conflict', system.conflict ? CONFLICT_LEVELS[system.conflict] : null],
    ['First logged', formatDate(system.createdAt)]
  ];
  const shownFacts = facts.filter(([, value]) => value !== null && value !== '');

  const logFromPanel = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const note = form.querySelector<HTMLInputElement>('#visitNote')?.value.trim() ?? '';
    const packetRun = form.querySelector<HTMLInputElement>('#visitPackets')?.checked ?? false;
    form.reset();
    logVisit(system.id, { note, packetRun });
  };

  return (
    <>
      <div
        data-sheet-grab
        className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-5 pt-3 md:pt-5 pb-4 space-y-3"
      >
        <SheetGrab onClose={dismissSystemPanel} />
        <div className="flex items-start gap-3">
          <span className="mt-2">
            <StarDot system={system} size="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="systemPanelTitle" className="font-display font-bold text-xl text-white leading-snug break-words">
              {system.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1">{meta.length ? <MetaLine parts={meta} /> : 'No details yet'}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              toggleFavorite(system.id);
            }}
            aria-pressed={system.favorite}
            aria-label={system.favorite ? 'Remove from favourites' : 'Add to favourites'}
            className={`${ICON_BUTTON} ${system.favorite ? 'text-amber-300' : 'text-slate-400 hover:text-white'} hover:bg-slate-900`}
          >
            <i className={`${system.favorite ? 'ph-fill' : 'ph-bold'} ph-star text-lg`} />
          </button>
          {'share' in navigator ? (
            <button
              type="button"
              onClick={() => {
                shareSystem(system);
              }}
              aria-label="Share system"
              className={`${ICON_BUTTON} text-slate-400 hover:text-white hover:bg-slate-900`}
            >
              <i className="ph-bold ph-share-network text-lg" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              openSystemEditor(system.id);
            }}
            aria-label="Edit system"
            className={`${ICON_BUTTON} text-slate-400 hover:text-white hover:bg-slate-900`}
          >
            <i className="ph-bold ph-pencil-simple text-lg" />
          </button>
          <button
            type="button"
            onClick={closeSystemPanel}
            aria-label="Close"
            className="hidden md:flex w-9 h-9 -mr-1.5 rounded-xl items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900"
          >
            <i className="ph-bold ph-x text-lg" />
          </button>
        </div>
        <form onSubmit={logFromPanel} className="flex flex-wrap items-center gap-2">
          <input
            id="visitNote"
            type="text"
            maxLength={300}
            placeholder="Visit note (optional)"
            aria-label="Visit note (optional)"
            className="flex-1 min-w-[10rem] h-10 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base sm:text-sm text-white"
          />
          {outlaw ? (
            <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200">
              <input id="visitPackets" type="checkbox" defaultChecked className="accent-emerald-400" />
              Packet run
            </label>
          ) : null}
          <button
            type="submit"
            className="h-10 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold flex items-center gap-1.5"
          >
            <i className="ph-bold ph-map-pin" />
            Log visit
          </button>
        </form>
      </div>

      <div className="px-5 py-5 space-y-8">
        {status ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <OutlawPill status={status} />
            <span>
              {status.tone === 'wait' ? 'Contraband Agent restocking.' : 'Contraband Agent should be stocked.'}
            </span>
          </div>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="panel-heading">Your rating</h3>
            <span className="flex">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setRating(system.id, n);
                  }}
                  aria-label={`Rate ${n} of 5`}
                  className={`w-8 h-8 flex items-center justify-center ${n <= system.rating ? 'text-amber-300' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  <i className={`${n <= system.rating ? 'ph-fill' : 'ph-bold'} ph-star`} />
                </button>
              ))}
            </span>
          </div>
          {system.tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {system.tags.map(tag => (
                <TagChip
                  key={tag}
                  tag={tag}
                  onClick={() => {
                    filterByTag(tag);
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No tags yet. Use edit to add some.</p>
          )}
        </section>

        <Notes system={system} open={open} />

        {shownFacts.length ? (
          <section className="space-y-2">
            <h3 className="panel-heading">System</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {shownFacts.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-100 min-w-0">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="panel-heading">
              Planets <span className="font-mono font-normal text-slate-400">{system.planets.length}</span>
            </h3>
            {editingPlanet === 'new' ? null : (
              <button
                type="button"
                onClick={() => {
                  setEditingPlanet('new');
                }}
                className="text-xs font-medium text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
              >
                <i className="ph-bold ph-plus" />
                Add planet
              </button>
            )}
          </div>
          {editingPlanet === 'new' ? (
            <PlanetForm
              systemId={system.id}
              onDone={() => {
                setEditingPlanet(null);
              }}
            />
          ) : null}
          <ul className="space-y-2">
            {system.planets.map(planet =>
              editingPlanet === planet.id ? (
                <li key={planet.id}>
                  <PlanetForm
                    systemId={system.id}
                    planet={planet}
                    onDone={() => {
                      setEditingPlanet(null);
                    }}
                  />
                </li>
              ) : (
                <li key={planet.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0">
                      <strong className="text-sm text-white">{planet.name}</strong>{' '}
                      {planet.biome ? <span className="text-xs text-slate-400">{planet.biome}</span> : null}
                    </p>
                    <span className="flex shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlanet(planet.id);
                        }}
                        aria-label={`Edit ${planet.name}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        <i className="ph-bold ph-pencil-simple" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmDelete(`planet:${planet.id}`)) deletePlanet(system.id, planet.id);
                        }}
                        aria-label={`Delete ${planet.name}`}
                        className={`h-8 ${armed === `planet:${planet.id}` ? ARMED : 'w-8 text-slate-400 hover:text-rose-300 hover:bg-slate-800'} rounded-lg flex items-center justify-center gap-1`}
                      >
                        <i className="ph-bold ph-trash" />
                        {armed === `planet:${planet.id}` ? 'Delete?' : null}
                      </button>
                    </span>
                  </div>
                  {planet.tags.length ? (
                    <div className="flex flex-wrap gap-1">
                      {planet.tags.map(tag => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                    </div>
                  ) : null}
                  {planet.notes ? <p className="text-xs text-slate-300 whitespace-pre-line">{planet.notes}</p> : null}
                </li>
              )
            )}
          </ul>
          {!system.planets.length && editingPlanet !== 'new' ? (
            <p className="text-xs text-slate-400">
              No planets logged. Add the ones with bases, hotspots, crash sites or anything else worth finding again.
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="panel-heading">
            Visit journal <span className="font-mono font-normal text-slate-400">{system.visits.length}</span>
          </h3>
          {system.visits.length ? (
            <ol className="space-y-2">
              {system.visits
                .map((visit, index) => ({ visit, index }))
                .reverse()
                .map(({ visit, index }) => {
                  const key = `visit:${system.id}:${index}`;
                  return (
                    <li
                      key={`${visit.at}-${index}`}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800"
                    >
                      <i className="ph-bold ph-map-pin text-emerald-300 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-400">
                          <time dateTime={visit.at}>{formatDate(visit.at)}</time>
                          {` · ${formatAgo(visit.at, now)}${visit.packets ? ' · ' : ''}`}
                          {visit.packets ? (
                            <>
                              <span className="text-emerald-300">{visit.packets} packets</span>
                            </>
                          ) : null}
                        </p>
                        {visit.note ? (
                          <p className="text-sm text-slate-200 mt-0.5 whitespace-pre-line">{visit.note}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmDelete(key)) deleteVisit(system.id, index);
                        }}
                        aria-label="Delete this visit"
                        className={`h-8 ${armed === key ? ARMED : 'w-8 text-slate-500 hover:text-rose-300 hover:bg-slate-800'} rounded-lg flex items-center justify-center gap-1 shrink-0`}
                      >
                        <i className="ph-bold ph-x" />
                        {armed === key ? 'Delete?' : null}
                      </button>
                    </li>
                  );
                })}
            </ol>
          ) : (
            <p className="text-xs text-slate-400">
              No visits yet. “Log visit” records today’s date and an optional note.
            </p>
          )}
        </section>

        <section className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (!confirmDelete(`system:${system.id}`)) return;
              closeSystemPanel();
              deleteSystem(system.id);
            }}
            className={`h-9 px-3 rounded-lg border ${armed === `system:${system.id}` ? 'bg-rose-500/15 border-rose-500/60 text-rose-200 font-semibold' : 'border-slate-700 text-slate-400 hover:text-rose-300 hover:border-rose-500/40'} text-xs flex items-center gap-2`}
          >
            <i className="ph-bold ph-trash" />
            {armed === `system:${system.id}` ? 'Click again to delete this system' : 'Delete system'}
          </button>
        </section>
      </div>
    </>
  );
}

function shareSystem(system: System) {
  const text = [
    system.name,
    [system.region, system.galaxy].filter(Boolean).join(' · '),
    system.glyphs ? `Portal glyphs: ${system.glyphs}` : ''
  ]
    .filter(Boolean)
    .join('\n');
  navigator.share({ title: system.name, text }).catch(() => undefined); // dismissing the share sheet rejects
}

function PlanetForm({ systemId, planet, onDone }: { systemId: string; planet?: Planet; onDone: () => void }) {
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (name: string) => {
      const value = data.get(name);
      return typeof value === 'string' ? value : '';
    };
    if (!field('name').trim()) return;
    onDone();
    savePlanet(systemId, planet?.id ?? null, {
      name: field('name'),
      biome: field('biome'),
      tags: field('tags'),
      notes: field('notes')
    });
  };
  const input = 'h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-base sm:text-sm text-white';
  return (
    <form onSubmit={submit} className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={planet?.name ?? ''}
          placeholder="Planet name *"
          aria-label="Planet name"
          autoFocus
          className={input}
        />
        <input
          name="biome"
          list="biomeOptions"
          maxLength={40}
          defaultValue={planet?.biome ?? ''}
          placeholder="Biome (e.g. Paradise)"
          aria-label="Biome"
          className={input}
        />
      </div>
      <input
        name="tags"
        maxLength={200}
        defaultValue={planet?.tags.join(', ') ?? ''}
        placeholder="Tags, comma separated (e.g. base, oxygen-hotspot)"
        aria-label="Planet tags"
        className={`w-full ${input}`}
      />
      <textarea
        name="notes"
        rows={2}
        maxLength={1000}
        defaultValue={planet?.notes ?? ''}
        placeholder="Notes"
        aria-label="Planet notes"
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base sm:text-sm text-white"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="h-9 px-3 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-9 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold"
        >
          {planet ? 'Save planet' : 'Add planet'}
        </button>
      </div>
    </form>
  );
}

// Notes typed but not yet saved. Kept outside React so the hook below can carry them into another tab's copy
// when that copy is adopted mid-typing: writing a stale textarea later would overwrite newer notes instead.
let pending: { systemId: string; text: string } | null = null;

onAdopt(() => {
  if (!pending) return;
  const system = appState.systems.find(item => item.id === pending?.systemId);
  if (system && system.notes !== pending.text) {
    system.notes = pending.text;
    persistState();
  }
  pending = null;
});

// Saves the typed notes, if any: true once stored, false if storage failed, null when nothing was typed.
function savePending(): boolean | null {
  const typed = pending;
  pending = null;
  if (!typed || typed.text === appState.systems.find(item => item.id === typed.systemId)?.notes) return null;
  return saveNotes(typed.systemId, typed.text);
}

// The notes show what's stored until the person types; their draft autosaves 800 ms after the last keystroke,
// on blur, and when the panel closes or moves to another system.
function Notes({ system, open }: { system: System; open: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = () => {
    clearTimeout(timer.current);
    setDraft(null);
    const saved = savePending();
    if (saved !== null) setStatus(saved ? 'Saved' : 'Not saved');
  };

  useEffect(() => {
    if (!open) savePending();
  }, [open]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      savePending();
    },
    []
  );

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="panel-heading">
          <label htmlFor="systemNotes">Notes</label>
        </h3>
        <span id="notesStatus" className="text-[11px] text-slate-400">
          {status}
        </span>
      </div>
      <textarea
        id="systemNotes"
        rows={5}
        value={draft ?? system.notes}
        onChange={event => {
          const text = event.target.value;
          pending = { systemId: system.id, text };
          setDraft(text);
          setStatus('Editing…');
          clearTimeout(timer.current);
          timer.current = setTimeout(flush, 800);
        }}
        onBlur={flush}
        placeholder="Anything worth remembering: what's here, what to do next time, who to talk to…"
        className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-base sm:text-sm leading-relaxed text-white focus:outline-hidden resize-y"
      />
    </section>
  );
}
