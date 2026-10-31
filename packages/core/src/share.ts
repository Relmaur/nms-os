// What a shared picture says (designs 23, 24 and 25): the system postcard and the Fleet card, as plain data the web app
// draws on a canvas on the device. Nothing is uploaded. The player chooses what's on a postcard; their notes and the
// portal address start off, since a picture outlives the moment it's shared.
import { classLetter, slotGrid, slotShort, type GearItem, type SlotRules } from './gear.ts';
import { RACES, type System } from './systems-model.ts';

export const SHARE_SITE = 'atlas-os.cloud';
export const FAN_LINE = 'Fan-made. Not affiliated with Hello Games.';
export const SHARE_FORMATS = {
  square: { label: 'Square', width: 1080, height: 1080 },
  story: { label: 'Story', width: 1080, height: 1920 },
  wide: { label: 'Wide', width: 1920, height: 1080 }
} as const;
export type ShareFormat = keyof typeof SHARE_FORMATS;
export const FLEET_SIZE = { width: 810, height: 1440 };

export interface PostcardOptions {
  planets: boolean;
  rating: boolean;
  notes: boolean;
  portal: boolean;
}
export const POSTCARD_DEFAULTS: PostcardOptions = { planets: true, rating: true, notes: false, portal: false };

export interface Postcard {
  eyebrow: string; // "HOME SYSTEM · ★★★★★"
  name: string;
  lines: string[];
  tags: string[];
  note: string;
  portal: string;
  labels: { name: string; biome: string }[] | null; // one per planet, in order; null leaves the planets unnamed
  footer: string;
}

const stars = (rating: number) => '★'.repeat(Math.max(0, Math.min(5, Math.round(rating))));
const joined = (...parts: string[]) => parts.filter(Boolean).join(' · ');
const shortDate = (iso: string) => {
  const at = new Date(iso);
  return Number.isNaN(at.getTime())
    ? ''
    : at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const game = (version: string | null) => (version ? `game v${version}` : '');

/** Markdown and wiki links as the plain words a picture or a text message can carry. */
export function plainNote(markdown: string, length = 140): string {
  const text = markdown
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target)
    .replace(/[#*_`>|[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

function worlds(system: Pick<System, 'planetCount' | 'planets'>): string {
  const count = system.planetCount || system.planets.length;
  return count ? `${String(count)} world${count === 1 ? '' : 's'}` : '';
}

export function postcard(system: System, options: PostcardOptions, gameVersion: string | null): Postcard {
  const home = system.planets.some(planet => planet.tags.includes('base'));
  return {
    eyebrow: joined(home ? 'HOME SYSTEM' : '', options.rating ? stars(system.rating) : ''),
    name: system.name,
    lines: [
      joined(system.region, system.galaxy),
      joined(system.race ? RACES[system.race] : '', system.economy, worlds(system))
    ].filter(Boolean),
    tags: options.rating ? system.tags : [],
    note: options.notes ? plainNote(system.notes) : '',
    portal: options.portal ? system.glyphs : '',
    labels: options.planets
      ? system.planets.map(planet => ({
          name: planet.name,
          biome: joined(planet.biome.toUpperCase(), planet.tags.includes('base') ? 'BASE' : '')
        }))
      : null,
    footer: joined(system.createdAt ? `Logged ${shortDate(system.createdAt)}` : '', game(gameVersion))
  };
}

/** The same choices as words, for "Copy as text". */
export function postcardText(card: Postcard): string {
  return [
    joined(card.name, card.eyebrow.replace('HOME SYSTEM', 'Home system')),
    ...card.lines,
    card.tags.join(', '),
    ...(card.labels ?? []).map(label => `${label.name}: ${label.biome.toLowerCase()}`),
    card.note,
    card.portal && `Portal address: ${card.portal}`,
    `Logged with ATLAS:OS, ${SHARE_SITE}`
  ]
    .filter(Boolean)
    .join('\n');
}

export interface FleetCard {
  role: string;
  name: string;
  line: string;
  letter: 'C' | 'B' | 'A' | 'S' | null;
  rows: number;
  cols: number;
  cells: { slot: string; label: string }[]; // the supercharged ones
  count: string; // "4 / 4 SUPERCHARGED"
  note: string;
  matches: boolean; // the marks agree with the wiki's cited rules
  footer: string;
}

export function fleetCard(
  item: GearItem,
  kindLabel: string,
  rules: SlotRules,
  matches: boolean,
  includeNote: boolean,
  gameVersion: string | null
): FleetCard {
  const grid = slotGrid(item.superchargedSlots, { rows: Math.min(rules.maxRows, 6), cols: rules.columns });
  const slots = item.superchargedSlots.length;
  return {
    role: item.role.toUpperCase(),
    name: item.name,
    line: joined(item.type, kindLabel),
    letter: classLetter(item.class),
    rows: grid.rows,
    cols: grid.cols,
    cells: item.superchargedSlots.map(slot => ({ slot, label: slotShort(item.slotLabels[slot]) })),
    count: `${rules.supercharged === null ? String(slots) : `${String(slots)} / ${String(rules.supercharged)}`} SUPERCHARGED`,
    note: includeNote ? plainNote(item.notes, 160) : '',
    matches,
    footer: joined('Logged in ATLAS', game(gameVersion))
  };
}

/** Names a saved picture: "masdalri-junction-square.png". */
export function shareFileName(name: string, kind: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${slug || 'atlas'}-${kind}.png`;
}
