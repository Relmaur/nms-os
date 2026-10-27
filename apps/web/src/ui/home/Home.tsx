// Home: what you need mid-session. The current system with one-tap logging, the warp-back list, the next outlaw
// stations and the fleet. The layout and classes match the vanilla screen this replaced, so tests and looks hold.
import { formatAgo, formatDuration } from '@atlas/core/format';
import { homeSummary, type HomeSummary } from '@atlas/core/home';
import { lastVisit, type System } from '@atlas/core/systems-model';
import { asString, isPlainObject } from '@atlas/core/util';
import type { AppState } from '@atlas/core/state';
import { openSystem, openSystemEditor } from '../systems/panel-store.ts';
import { logPacketRun, logVisit } from '../actions.ts';
import { useAppState } from '../useAppState.ts';
import { useNow } from '../useNow.ts';
import { GlyphChip, StarDot, TagChip } from '../parts/SystemBits.tsx';
import { toggleKeepAwake, useDevice } from '../more/device-store.ts';
import { startSession } from '../actions.ts';

const ROW = 'flex items-center gap-2 -mx-2 px-2 py-1.5 rounded-xl hover:bg-slate-900/70';

export function Home() {
  const state = useAppState();
  const now = useNow();
  const summary = homeSummary(state, now);
  const device = useDevice();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-white">Home</h1>
          <p id="homePhase" className="text-sm text-slate-400 mt-1">
            {state.meta.currentPhase}
          </p>
        </div>
        {/* Its own line on phones, so Keep screen on stays put when Start session goes. */}
        <div className="basis-full sm:basis-auto flex flex-wrap items-center gap-2">
          {state.session === null && (
            <button type="button" id="startSession" onClick={startSession} className="wake-chip session-start">
              <i className="ph-fill ph-play" aria-hidden="true" />
              <span>Start session</span>
            </button>
          )}
          {device.wakeSupported && (
            <button
              type="button"
              role="switch"
              aria-checked={device.awake}
              onClick={toggleKeepAwake}
              className="wake-chip"
            >
              <i className="ph-bold ph-sun-dim" aria-hidden="true" />
              <span>Keep screen on</span>
            </button>
          )}
        </div>
      </div>
      <div id="homeNow">
        <CurrentSystem system={summary.current} now={now} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="hud-card rounded-2xl p-4 sm:p-5 space-y-4">
          <CardHeader icon="ph-skull text-red-300" title="Outlaw run" href="#outlaw" link="Full list →" />
          <div id="homeOutlaw">
            <OutlawCard card={summary.outlaw} now={now} />
          </div>
        </div>
        <div className="hud-card rounded-2xl p-4 sm:p-5 space-y-4">
          <CardHeader
            icon="ph-clock-counter-clockwise text-purple-300"
            title="Warp back"
            href="#systems"
            link="All systems →"
          />
          <ul id="homeRecent" className="space-y-1">
            <WarpBack systems={summary.recent} now={now} />
          </ul>
        </div>
      </div>
      <div className="hud-card rounded-2xl p-4 sm:p-5 space-y-3">
        <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
          <i className="ph-bold ph-rocket text-cyan-300" />
          Active fleet
        </h2>
        <div id="fleetCardBody" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-3 text-xs">
          <Fleet fleet={state.fleet} />
        </div>
      </div>
    </>
  );
}

function CardHeader({ icon, title, href, link }: { icon: string; title: string; href: string; link: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
        <i className={`ph-bold ${icon}`} />
        {title}
      </h2>
      <a href={href} className="text-xs font-medium text-emerald-300 hover:text-emerald-200">
        {link}
      </a>
    </div>
  );
}

function NewSystemButton() {
  return (
    <button
      type="button"
      onClick={() => {
        openSystemEditor();
      }}
      className="h-12 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition"
    >
      <i className="ph-bold ph-plus" />
      Warped somewhere new
    </button>
  );
}

function CurrentSystem({ system, now }: { system: System | undefined; now: number }) {
  if (!system) {
    return (
      <div className="hud-card rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="space-y-1.5">
          <h2 className="font-display text-lg font-bold text-white">Log your first system</h2>
          <p className="text-sm text-slate-300 max-w-prose">
            Warp somewhere, then add it here with its glyphs and what’s worth coming back for. It becomes your current
            system, one tap to log again.
          </p>
        </div>
        <div className="grid sm:flex">
          <NewSystemButton />
        </div>
      </div>
    );
  }
  const last = lastVisit(system);
  const where = [
    last ? `Here ${formatAgo(last.at, now)}` : `Added ${formatAgo(system.createdAt, now)}`,
    system.region,
    system.galaxy
  ]
    .filter(Boolean)
    .join(' · ');
  const note = system.notes.split('\n').find(line => line.trim());
  return (
    <div className="hud-card rounded-2xl p-5 sm:p-6 space-y-4">
      <button
        type="button"
        onClick={() => {
          openSystem(system.id);
        }}
        className="group flex items-start gap-3 max-w-full text-left"
      >
        <span className="flex mt-2.5">
          <StarDot system={system} size="w-3.5 h-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-xl sm:text-2xl font-bold text-white leading-snug break-words group-hover:underline underline-offset-4 decoration-slate-600">
            {system.name}
          </span>
          <span className="block text-sm text-slate-400 mt-1">{where}</span>
        </span>
      </button>
      {system.tags.length || system.glyphs ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <GlyphChip glyphs={system.glyphs} />
          {system.tags.slice(0, 5).map(tag => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      ) : null}
      {note ? <p className="text-sm text-slate-300 line-clamp-2 max-w-prose">{note}</p> : null}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-1">
        <div className="col-span-2 grid sm:contents">
          <NewSystemButton />
        </div>
        <button
          type="button"
          onClick={() => {
            logVisit(system.id);
          }}
          className="h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-400/60 text-sm font-medium text-slate-100 flex items-center justify-center gap-2 transition"
        >
          <i className="ph-bold ph-map-pin" />
          Log visit
        </button>
        <button
          type="button"
          onClick={() => {
            openSystem(system.id);
          }}
          className="h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-sm font-medium text-slate-100 flex items-center justify-center gap-2 transition"
        >
          <i className="ph-bold ph-note-pencil" />
          Details
        </button>
      </div>
    </div>
  );
}

function WarpBack({ systems, now }: { systems: System[]; now: number }) {
  if (!systems.length) {
    return <li className="text-sm text-slate-400">Systems you log land here, so warping back is one tap.</li>;
  }
  return systems.map(system => {
    const last = lastVisit(system);
    const meta = [last ? formatAgo(last.at, now) : 'Never visited', system.region].filter(Boolean).join(' · ');
    return (
      <li key={system.id} className={ROW}>
        <button
          type="button"
          onClick={() => {
            openSystem(system.id);
          }}
          className="flex items-center gap-3 min-w-0 flex-1 text-left py-1"
        >
          <StarDot system={system} />
          <span className="min-w-0">
            <span className="block text-sm text-white truncate">{system.name}</span>
            <span className="block text-xs text-slate-400 truncate">{meta}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            logVisit(system.id);
          }}
          aria-label={`I’m here: ${system.name}`}
          className="shrink-0 h-9 px-3 rounded-lg border border-slate-700 hover:border-emerald-400/60 hover:text-emerald-200 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition"
        >
          <i className="ph-bold ph-map-pin" />
          I’m here
        </button>
      </li>
    );
  });
}

function OutlawCard({ card, now }: { card: HomeSummary['outlaw']; now: number }) {
  if (!card.total) {
    return (
      <>
        <p className="text-sm text-slate-300">
          Tag systems with outlaw stations to plan Suspicious Packet runs and see which have restocked.
        </p>
        <button
          type="button"
          onClick={() => {
            openSystemEditor(null, { tags: ['outlaw'], conflict: 'pirate' });
          }}
          className="mt-3 h-10 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-sm text-slate-100 flex items-center gap-2"
        >
          <i className="ph-bold ph-plus" />
          Add outlaw system
        </button>
      </>
    );
  }
  return (
    <>
      <p className="text-sm text-slate-300">
        <strong className={card.ready ? 'text-emerald-300' : 'text-amber-300'}>
          {card.ready} of {card.total} ready
        </strong>
        {card.ready ? ` · next run ~${card.runNanites.toLocaleString()} Nanites` : null}
      </p>
      {card.next.length ? (
        <ul className="mt-3 space-y-1">
          {card.next.map(({ system }) => (
            <li key={system.id} className={ROW}>
              <button
                type="button"
                onClick={() => {
                  openSystem(system.id);
                }}
                className="min-w-0 flex-1 text-left py-1"
              >
                <span className="block text-sm text-white truncate">{system.name}</span>
                <span className="block text-xs text-slate-400 truncate">
                  {[system.region, system.galaxy].filter(Boolean).join(' · ') || 'No region logged'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  logPacketRun(system.id);
                }}
                className="shrink-0 h-9 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 text-xs font-semibold flex items-center gap-1.5"
              >
                <i className="ph-bold ph-check" />
                Visited
              </button>
            </li>
          ))}
        </ul>
      ) : card.soonest ? (
        <p className="mt-2 text-sm text-slate-400">
          All restocking. {card.soonest.system.name} is ready in {formatDuration(card.soonest.status.readyAt - now)}.
        </p>
      ) : null}
    </>
  );
}

const FLEET_COLORS = ['text-purple-300', 'text-cyan-300'];

function Fleet({ fleet }: { fleet: AppState['fleet'] }) {
  // Fleet entries come from the user's file as-is: each one is checked with isPlainObject() below.
  const tools: unknown[] = Array.isArray(fleet.multiTools) ? fleet.multiTools : [];
  const rows: [string, unknown, string][] = [
    ['Flagship', fleet.primaryStarship, 'text-white font-semibold'],
    ['Scrap Spare', fleet.salvageStarship, 'text-amber-300'],
    ...tools.map((tool, i): [string, unknown, string] => [
      'Multi-Tool',
      tool,
      FLEET_COLORS[i % FLEET_COLORS.length] ?? ''
    ])
  ];
  return rows.map(([label, item, color], i) =>
    isPlainObject(item) ? (
      <div key={i} title={asString(item.role || item.type)}>
        <span className="block text-[11px] text-slate-400">{label}</span>
        <span className={`block font-mono ${color} leading-snug`}>
          {asString(item.name)}
          {item.class ? (
            <>
              {' '}
              <span className="text-slate-400">{asString(item.class)}</span>
            </>
          ) : null}
        </span>
      </div>
    ) : null
  );
}
