// The Traveller Card's art (component c11, "Current", islands + tides; ported from the design's
// traveller_current.py): a flow field bent by every system the player logged with a portal address.
//   1. One vortex per system, at its true position (map.ts), centred and scaled on the player's own cluster. With
//      more than one galaxy, each galaxy gets its own island of the coin, clockwise from the top in the order
//      reached, sized by its share of systems, its systems at their true relative places inside it.
//   2. A gentle relaxation keeps a minimum spacing, so close systems never merge into one swirl.
//   3. Lines are seeded round every vortex (so each visibly turns) plus a loose background field, and traced through
//      the field. A line takes its nearest system's star colour, or with several galaxies its galaxy's tide colour.
//   4. Each vortex gets an eye in its star's colour; spin alternates by galaxy, strength grows with planets.
// Pure and seeded: the same log draws the same art on every device (seed.ts matches the reference generator).
import { tide, type Journey } from './map.ts';
import { Rng, seedOf } from './seed.ts';
import { STAR_CLASSES } from './systems-model.ts';

const MAX_VORTICES = 200;
const UNLOGGED_STAR = '#94a3b8';

export interface CurrentArt {
  lines: { d: string; colour: string; duration: number; delay: number }[];
  eyes: { x: number; y: number; r: number; colour: string }[];
  islands: { x: number; y: number; r: number; colour: string; name: string }[];
  vortices: number;
}

interface Well {
  x: number;
  y: number;
  spin: number;
  star: string;
  galaxy: number; // index among the galaxies that have a placed system
}

export function currentArt(trip: Journey, S = 300): CurrentArt {
  const c = S / 2;
  const u = S / 300;
  const raw: { x: number; y: number; spin: number; star: string; galaxy: number }[] = [];
  const groups = trip.galaxies.filter(g => g.placed.length);
  groups.forEach((galaxy, gi) => {
    for (const p of galaxy.placed) {
      if (raw.length >= MAX_VORTICES) return;
      const planets = p.system.planetCount || p.system.planets.length;
      raw.push({
        x: p.reach * Math.cos(p.angle),
        y: p.reach * Math.sin(p.angle),
        spin: (gi % 2 === 0 ? 1 : -1) * (0.6 + planets * 0.1),
        star: p.system.star ? STAR_CLASSES[p.system.star].color : UNLOGGED_STAR,
        galaxy: gi
      });
    }
  });
  const n = raw.length;
  const ng = groups.length;
  let wells: Well[] = [];
  let sep = 0;
  let soft = 0;
  if (n) {
    const mx = raw.reduce((sum, r) => sum + r.x, 0) / n;
    const my = raw.reduce((sum, r) => sum + r.y, 0) / n;
    const spread = Math.max(Math.max(...raw.map(r => Math.hypot(r.x - mx, r.y - my))), 1e-4);
    const k = (S * 0.3) / spread;
    let pts = n === 1 ? [[c, c]] : raw.map(r => [c + (r.x - mx) * k, c + (r.y - my) * k]);
    if (ng > 1) {
      // Islands: each galaxy its own sector, sized by its share, in visit order; calm water between them.
      pts = new Array<number[]>(n);
      let acc = 0;
      for (let g = 0; g < ng; g++) {
        const idx = raw.flatMap((r, i) => (r.galaxy === g ? [i] : []));
        if (!idx.length) continue;
        const share = idx.length / n;
        const mid = -Math.PI / 2 + 2 * Math.PI * (acc + share / 2);
        acc += share;
        const ring = S * (ng > 2 ? 0.25 : 0.2);
        const gx = c + ring * Math.cos(mid);
        const gy = c + ring * Math.sin(mid);
        const lx = idx.reduce((sum, i) => sum + (raw[i]?.x ?? 0), 0) / idx.length;
        const ly = idx.reduce((sum, i) => sum + (raw[i]?.y ?? 0), 0) / idx.length;
        const spr = Math.max(Math.max(...idx.map(i => Math.hypot((raw[i]?.x ?? 0) - lx, (raw[i]?.y ?? 0) - ly))), 1e-4);
        const rg = Math.min(S * 0.24 * Math.sqrt(share), S * 0.12, S * 0.62 * Math.sin(Math.PI * share) + S * 0.03);
        for (const i of idx) {
          const r = raw[i];
          pts[i] = idx.length > 1 && r ? [gx + ((r.x - lx) / spr) * rg, gy + ((r.y - ly) / spr) * rg] : [gx, gy];
        }
      }
    }
    sep = (S * 0.5) / Math.sqrt(n + 1.5); // the minimum spacing shrinks as the journey grows
    if (ng > 1) sep *= 0.8;
    const rmax = S * 0.37;
    const jit = new Rng(seedOf('sep', String(n)));
    for (let round = 0; round < 60; round++) {
      let moved = false;
      for (let a = 0; a < n; a++)
        for (let b = a + 1; b < n; b++) {
          const pa = pts[a];
          const pb = pts[b];
          if (!pa || !pb) continue;
          let dx = (pb[0] ?? 0) - (pa[0] ?? 0);
          let dy = (pb[1] ?? 0) - (pa[1] ?? 0);
          let dd = Math.hypot(dx, dy);
          if (dd < sep) {
            if (dd < 1e-6) {
              dx = jit.range(-1, 1);
              dy = jit.range(-1, 1);
              dd = 1;
            }
            const push = (sep - dd) / 2 / dd;
            pa[0] = (pa[0] ?? 0) - dx * push;
            pa[1] = (pa[1] ?? 0) - dy * push;
            pb[0] = (pb[0] ?? 0) + dx * push;
            pb[1] = (pb[1] ?? 0) + dy * push;
            moved = true;
          }
        }
      for (const q of pts) {
        const dx = (q[0] ?? 0) - c;
        const dy = (q[1] ?? 0) - c;
        const dd = Math.hypot(dx, dy);
        if (dd > rmax) {
          q[0] = c + (dx / dd) * rmax;
          q[1] = c + (dy / dd) * rmax;
        }
      }
      if (!moved) break;
    }
    wells = raw.map((r, i) => ({
      x: pts[i]?.[0] ?? c,
      y: pts[i]?.[1] ?? c,
      spin: r.spin,
      star: r.star,
      galaxy: r.galaxy
    }));
    soft = (sep * 0.18) ** 2;
  }

  const rng = new Rng(seedOf('current', String(n)));
  const seeds: [number, number][] = [];
  const per = Math.max(2, Math.min(9, Math.floor(160 / Math.max(n, 1))));
  for (const w of wells)
    for (let m = 0; m < per; m++) {
      const th = (2 * Math.PI * m) / per + rng.range(-0.3, 0.3);
      const rr = sep * rng.range(0.18, 0.48);
      seeds.push([w.x + rr * Math.cos(th), w.y + rr * Math.sin(th)]);
    }
  for (let i = 0; i < (n ? 70 : 110); i++) seeds.push([rng.range(S * 0.08, S * 0.92), rng.range(S * 0.08, S * 0.92)]);

  const lines: CurrentArt['lines'] = [];
  for (const [sx, sy] of seeds) {
    let x = sx;
    let y = sy;
    const path: [number, number][] = [[x, y]];
    let colour = '#67e8f9';
    let best = Infinity;
    for (let step = 0; step < 34; step++) {
      let vx = 0;
      let vy = 0;
      for (const w of wells) {
        const dx = x - w.x;
        const dy = y - w.y;
        const r2 = dx * dx + dy * dy + soft;
        vx += (-dy * w.spin) / r2;
        vy += (dx * w.spin) / r2;
        if (r2 < best) {
          best = r2;
          colour = ng > 1 ? tide(w.galaxy, ng) : w.star;
        }
      }
      if (wells.length) {
        vx += (c - x) * 2e-6;
        vy += (c - y) * 2e-6;
      } else {
        vx = -(y - c);
        vy = x - c;
      }
      const m = Math.hypot(vx, vy) + 1e-12;
      x += (vx / m) * 3.6 * u;
      y += (vy / m) * 3.6 * u;
      if (Math.hypot(x - c, y - c) > S * 0.47) break;
      path.push([x, y]);
    }
    if (path.length > 4) {
      const duration = rng.range(3.2, 7.5);
      lines.push({
        d: `M${path.map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join(' L')}`,
        colour,
        duration,
        delay: -rng.range(0, duration)
      });
    }
  }

  const er = Math.max(1.1, 3.0 - n * 0.011) * u;
  const eyes = wells.map(w => ({ x: w.x, y: w.y, r: er, colour: w.star }));
  const islands: CurrentArt['islands'] = [];
  if (ng > 1)
    groups.forEach((galaxy, g) => {
      const gw = wells.filter(w => w.galaxy === g);
      if (!gw.length) return;
      const gx = gw.reduce((sum, w) => sum + w.x, 0) / gw.length;
      const gy = gw.reduce((sum, w) => sum + w.y, 0) / gw.length;
      const r = Math.max(...gw.map(w => Math.hypot(w.x - gx, w.y - gy))) + sep * 0.55;
      islands.push({ x: gx, y: gy, r, colour: tide(g, ng), name: galaxy.name });
    });
  return { lines, eyes, islands, vortices: n };
}
