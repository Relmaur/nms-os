// The Traveller Card's two faces: the front (design 05; info A, c13) and the back, "Reading this card" (29, c12).
// The frame grows with the class (c09): slate on day one, a gold hairline at C and B, a double gold frame at A, a foil
// edge at S. Only the art and the class badge move with tilt (.card-tilt in theme.css); the body stays still.
import { useState, type ReactNode } from 'react';
import type { CurrentArt } from '@atlas/core/current';
import type { GameVersion } from '@atlas/core/facts';
import { tide } from '@atlas/core/map';
import { DEPTH_POINTS, STAR_COLOUR, STAR_ORDER, deepestReading, type TravellerCard } from '@atlas/core/traveller';
import { CardArt } from './CardArt.tsx';

const two = (n: number) => (n < 10 ? `0${String(n)}` : n.toLocaleString('en'));
const date = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
// The app's own address, as the card prints it.
const HOME = () => `${location.host}${location.pathname.replace(/\/(index\.html)?$/, '')}`;
const NEXT_PERK: Record<string, string> = {
  B: 'At B the card deepens.',
  A: 'At A the frame doubles.',
  S: 'At S the foil runs round the edge.'
};

function Frame({ card, children }: { card: TravellerCard; children: ReactNode }) {
  const dayOne = card.issuedAt === null;
  return (
    <div
      className={`card-face absolute inset-0 rounded-[22px] overflow-hidden bg-[linear-gradient(160deg,#0b1222,#060a15_55%,#0b1020)] border ${
        card.cls === 'S' ? 'card-foil-edge border-transparent' : 'border-[#1e293b]'
      }`}
    >
      <div
        className={`absolute inset-[9px] rounded-[16px] border pointer-events-none ${dayOne ? 'border-[rgba(148,163,184,0.25)]' : 'border-[rgba(252,211,77,0.45)]'}`}
      />
      {(card.cls === 'A' || card.cls === 'S') && (
        <div className="absolute inset-[14px] rounded-[12px] border border-[rgba(252,211,77,0.28)] pointer-events-none" />
      )}
      {[
        'top-[6px] left-[6px] border-l border-t',
        'top-[6px] right-[6px] border-r border-t',
        'bottom-[6px] left-[6px] border-l border-b',
        'bottom-[6px] right-[6px] border-r border-b'
      ].map(corner => (
        <span key={corner} aria-hidden="true" className={`absolute w-3 h-3 border-[rgba(252,211,77,0.6)] ${corner}`} />
      ))}
      <div className="relative h-full flex flex-col px-[22px] pt-[22px] pb-[18px]">{children}</div>
    </div>
  );
}

function Wordmark() {
  return (
    <span className="font-display font-extrabold text-[13px] tracking-[0.26em] text-ink-bright flex items-center gap-2">
      <i className="ph-bold ph-diamond text-scanner-cyan-pale" aria-hidden="true" />
      <span>
        ATLAS<span className="text-scanner-cyan-pale">:OS</span>
      </span>
    </span>
  );
}

export function CardFront({
  card,
  art,
  lyPerRegion,
  game,
  animate
}: {
  card: TravellerCard;
  art: CurrentArt;
  lyPerRegion: number | null;
  game: GameVersion | null;
  animate: boolean;
}) {
  const dayOne = card.issuedAt === null;
  const seen = STAR_ORDER.filter(star => card.stars[star] > 0);
  const deep = card.deepest && lyPerRegion ? deepestReading(card.deepest.regions, lyPerRegion) : null;
  const shown = card.firsts.slice(0, 3);
  return (
    <Frame card={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Wordmark />
          <span className="font-mono text-[9px] tracking-[0.14em] text-ink-label">TRAVELLER CARD · {card.id}</span>
        </div>
        <div
          className={`card-tilt-badge w-[46px] h-[46px] rounded-[12px] border grid place-items-center ${dayOne ? 'border-control-edge' : 'border-[rgba(252,211,77,0.45)] bg-[rgba(245,158,11,0.06)]'}`}
          aria-label={`Class ${card.cls}`}
          role="img"
        >
          <span
            className={`font-display font-black text-[20px] leading-none ${dayOne ? 'text-ink-muted' : 'card-foil-text'}`}
          >
            {card.cls}
          </span>
          <span className="text-[6.5px] font-semibold tracking-[0.18em] text-units-amber-pale -mt-2">CLASS</span>
        </div>
      </div>
      <div className="mt-3 h-px bg-[linear-gradient(90deg,rgba(103,232,249,0.5),rgba(167,139,250,0.5),rgba(252,211,77,0.3))]" />
      <div className="card-tilt-art -mx-2.5 mt-1 flex-1 min-h-0 grid place-items-center">
        <CardArt art={art} animate={animate} className="w-full max-h-full" />
      </div>
      <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-scanner-cyan-pale">
        Rank · {card.route.join(' → ')}
      </span>
      <h2 className="mt-1 font-display font-black text-[30px] leading-none text-ink-bright">{card.rank.title}</h2>
      <dl className="mt-3 flex">
        {(
          [
            ['Systems', card.systems],
            ['Galaxies', card.galaxies],
            ['Planets', card.planets],
            ['S-class', card.sclass]
          ] as const
        ).map(([label, value], i) => (
          <div
            key={label}
            className={`flex-1 flex flex-col-reverse gap-1.5 ${i ? 'pl-2.5 border-l border-[rgba(148,163,184,0.18)]' : ''}`}
          >
            <dt className="text-[8px] font-semibold tracking-[0.14em] uppercase text-ink-label">{label}</dt>
            <dd
              className={`font-display font-extrabold text-[21px] leading-none ${label === 'S-class' ? 'text-units-amber-text' : 'text-ink-bright'}`}
            >
              {two(value)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-2.5 px-3 py-2.5 rounded-[12px] border border-[rgba(148,163,184,0.14)] bg-[rgba(11,19,37,0.55)] flex flex-col gap-1.5">
        <div className="flex justify-between items-baseline">
          <span className="text-[8px] font-semibold tracking-[0.16em] uppercase text-ink-label">Stars</span>
          <span className="font-mono text-[9.5px] text-ink-label">{seen.length} of 5 colours</span>
        </div>
        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-slate-800">
          {seen.map(star => (
            <i key={star} className="block h-full" style={{ flex: card.stars[star], background: STAR_COLOUR(star) }} />
          ))}
        </div>
        <div className="flex justify-between items-baseline mt-1">
          <span className="text-[8px] font-semibold tracking-[0.16em] uppercase text-ink-label">
            Deepest toward a core
          </span>
          <span className="font-mono text-[9.5px] text-ink-label">{card.deepest?.galaxy ?? ''}</span>
        </div>
        {deep ? (
          <>
            <p className="flex items-baseline gap-2">
              <b className="font-mono text-[14px] text-units-amber-pale">{deep.ly}</b>
              <span className="text-[10px] text-ink-label">
                from the centre · {Math.round(deep.inward)}% of the way in
              </span>
            </p>
            <div className="relative h-[5px] rounded-full bg-slate-800">
              <i
                className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,rgba(252,211,77,0.15),rgba(252,211,77,0.85))]"
                style={{ width: `${deep.inward.toFixed(1)}%` }}
              />
              <em
                className="absolute top-1/2 w-[9px] h-[9px] rounded-full bg-units-amber-text -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${deep.inward.toFixed(1)}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[7.5px] tracking-[0.12em] text-ink-disabled">
              <span>RIM</span>
              <span>CORE ✦</span>
            </div>
          </>
        ) : (
          <p className="text-[10px] text-ink-label">Log a portal address and the card measures how deep you’ve gone.</p>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 overflow-hidden min-h-[22px]">
        {shown.map(first => (
          <span
            key={first.key}
            className="h-[22px] px-2 rounded-full border border-[rgba(252,211,77,0.45)] bg-[rgba(245,158,11,0.1)] text-[9.5px] font-semibold text-units-amber-pale inline-flex items-center whitespace-nowrap"
          >
            ★ {first.label}
          </span>
        ))}
        {card.firsts.length > 3 && (
          <span className="font-mono text-[10px] text-ink-label">+{card.firsts.length - 3}</span>
        )}
        {!card.firsts.length && <span className="text-[10px] text-ink-label">Your firsts will appear here.</span>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2 text-[8.5px] leading-[1.6] text-ink-label">
        <span>
          {card.issuedAt === null ? 'Issued today' : `Issued ${date(card.issuedAt)}`}
          {card.updatedAt !== null && card.issuedAt !== null && card.updatedAt - card.issuedAt > 86_400_000
            ? ` · updated ${date(card.updatedAt)}`
            : ''}
          {game ? ` · game v${game.version}` : ''}
          <br />
          Fan-made. Not affiliated with Hello Games.
        </span>
        <span className="font-mono text-[8.5px] text-scanner-cyan-pale whitespace-nowrap">{HOME()}</span>
      </div>
    </Frame>
  );
}

export function CardBack({ card, art }: { card: TravellerCard; art: CurrentArt }) {
  const [tab, setTab] = useState<'details' | 'reading'>('reading');
  const galaxies = card.trip.galaxies.filter(g => g.placed.length);
  const many = galaxies.length > 1;
  const starNames = STAR_ORDER.filter(star => card.stars[star] > 0);
  const per = Math.max(2, Math.min(9, Math.floor(160 / Math.max(art.vortices, 1))));
  const progress = card.next ? Math.min(100, (card.points.total / card.next.points) * 100) : 100;
  const unplaced = card.trip.unplaced;
  const reading: [string, string][] = [
    ['Vortices', `${String(art.vortices)}, one per system with an address; each eye is that system's star`],
    [
      'Islands',
      galaxies.length
        ? `${String(galaxies.length)}, ${galaxies.map(g => g.name).join(', ')}. Each new galaxy adds an island, clockwise, in its own colour`
        : 'None yet. Each galaxy you log a system in adds an island, clockwise, in its own colour'
    ],
    [
      'Colour',
      many
        ? "Each island's lines take its galaxy's colour by arrival: cyan, then violet, rose, amber"
        : `The nearest system's star${starNames.length ? `: ${starNames.join(' and ')}` : ''}`
    ],
    ['Light', 'The pulses flow in the direction of the current'],
    ['Density', `A base field, plus ${String(per)} lines seeded round each vortex`]
  ];
  const markers = [
    [0.37, 0.26],
    [0.66, 0.62],
    [0.8, 0.4],
    [0.45, 0.1],
    [0.2, 0.74]
  ];
  return (
    <Frame card={card}>
      <div className="flex items-center justify-between gap-3">
        <Wordmark />
        <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-label">Reading this card</span>
      </div>
      <div
        role="tablist"
        aria-label="Card back"
        className="mt-3 flex gap-1 p-1 rounded-control bg-slate-ground border border-hairline"
      >
        {(
          [
            ['details', 'Details'],
            ['reading', 'Reading this card']
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={event => {
              event.stopPropagation(); // a tap on the tabs doesn't flip the card
              setTab(key);
            }}
            className={`flex-1 h-8 rounded-segment border text-[12px] font-semibold ${tab === key ? 'bg-scanner-cyan-tint border-scanner-cyan-edge text-scanner-cyan-text' : 'border-transparent text-ink-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="mt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1 flex flex-col gap-3"
        role="tabpanel"
        tabIndex={0}
        aria-label={tab === 'reading' ? 'Reading this card' : 'Details'}
      >
        {tab === 'reading' ? (
          <>
            <div className="flex items-center gap-3">
              <div className="relative w-[118px] h-[118px] shrink-0 rounded-full overflow-hidden border border-hairline bg-[#03060d]">
                <CardArt art={art} animate={false} className="w-full h-full" />
                {markers.map(([x, y], i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="absolute w-[17px] h-[17px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-units-amber-text bg-[#060a15] grid place-items-center text-[9px] font-semibold text-units-amber-pale"
                    style={{ left: `${String((x ?? 0) * 100)}%`, top: `${String((y ?? 0) * 100)}%` }}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
              <p className="text-[12.5px] leading-snug text-ink">
                Your art is a <b className="text-ink-bright">current</b>: every system you log bends the lines around
                it. It changes only when your log does.
              </p>
            </div>
            <ol className="flex flex-col gap-2">
              {reading.map(([title, text], i) => (
                <li key={title} className="flex gap-2 text-[11px] leading-snug">
                  <span className="w-[17px] h-[17px] shrink-0 rounded-full border border-units-amber-text grid place-items-center text-[9px] font-semibold text-units-amber-pale">
                    {i + 1}
                  </span>
                  <span>
                    <b className="block text-ink-bright">{title}</b>
                    <span className="text-ink-soft">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="rounded-[12px] border border-hairline bg-[rgba(11,19,37,0.55)] p-3 flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[8.5px] font-semibold tracking-[0.16em] uppercase text-ink-label">
                  Class {card.cls}
                  {card.next ? ` → ${card.next.cls}` : ''}
                </span>
                <span className="font-mono text-[11px] text-units-amber-pale">
                  {card.points.total}
                  {card.next ? ` / ${String(card.next.points)}` : ''}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <i
                  className="block h-full bg-[linear-gradient(90deg,#fcd34d,#fde68a)]"
                  style={{ width: `${progress.toFixed(1)}%` }}
                />
              </div>
              <p className="text-[10.5px] text-ink-soft">
                Systems {card.systems}×{DEPTH_POINTS.system} · planets {card.planets}×{DEPTH_POINTS.planet} · S-class{' '}
                {card.sclass}×{DEPTH_POINTS.sclass} · firsts {card.firsts.length}×{DEPTH_POINTS.first}
                {card.milestones
                  ? ` · milestones ${String(card.milestones)}×${String(DEPTH_POINTS.milestone)}`
                  : ''}. {card.next ? NEXT_PERK[card.next.cls] : 'The top of the ladder: it never goes back down.'}
              </p>
            </div>
            <div className="rounded-[12px] border border-hairline bg-[rgba(11,19,37,0.55)] p-3 flex flex-col gap-1">
              <span className="text-[8.5px] font-semibold tracking-[0.16em] uppercase text-ink-label">
                Rank · {card.rank.title}
              </span>
              <p className="text-[10.5px] text-ink-soft">{card.rank.why}</p>
            </div>
          </>
        ) : (
          <>
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[8.5px] font-semibold tracking-[0.16em] uppercase text-ink-label">
                Firsts · {card.firsts.length}
              </h3>
              {card.firsts.length ? (
                <ul className="flex flex-col gap-1">
                  {card.firsts.map(first => (
                    <li key={first.key} className="flex justify-between gap-2 text-[11px]">
                      <span className="text-units-amber-pale">★ {first.label}</span>
                      <span className="font-mono text-ink-label">{first.at ? date(first.at) : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-ink-label">
                  None yet: a new star colour, world, race or galaxy earns one.
                </p>
              )}
            </section>
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[8.5px] font-semibold tracking-[0.16em] uppercase text-ink-label">
                Islands · in the order you reached them
              </h3>
              <ol className="flex flex-col gap-1">
                {card.trip.galaxies.map((galaxy, i) => (
                  <li key={galaxy.name} className="flex items-center gap-2 text-[11px]">
                    <i
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: tide(i, card.trip.galaxies.length) }}
                    />
                    <span className="flex-1 text-ink-bright">{galaxy.name}</span>
                    <span className="font-mono text-ink-label">
                      {galaxy.placed.length + galaxy.unplaced} system
                      {galaxy.placed.length + galaxy.unplaced === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </div>
      <p className="mt-2 text-[8.5px] leading-[1.6] text-ink-label">
        {unplaced
          ? `Not placed yet: ${String(unplaced)} system${unplaced === 1 ? '' : 's'} without a portal address (add one in the editor). `
          : ''}
        Nothing on this card is invented.
        <br />
        Fan-made. Not affiliated with Hello Games.
      </p>
    </Frame>
  );
}
