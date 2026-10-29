// The player's ships and Multi-Tools (state key `gear`, docs/state-schema.md, ADR-0007): their own records, which
// replaced the hard-coded fleet notes. Before 3.14.0 the log held a free-form `fleet` object; gearFromFleet() turns it
// into records once, and `fleet` itself is carried along untouched.
import { SAFE_ID, isPlainObject } from './util.ts';
import { getFact, type CitedFact, type FactsFile } from './facts.ts';

export const GEAR_KINDS = ['starship', 'multitool', 'exosuit'] as const; // exosuit: 3.16.0
export type GearKind = (typeof GEAR_KINDS)[number];

export interface GearItem {
  id: string;
  kind: GearKind;
  name: string;
  class: string; // S, A, B, C, or what the player wrote ("A -> S"); empty for an Exosuit, which has none
  type: string; // Sentinel Interceptor, Royal, …
  role: string; // Flagship, Scrap spare, Combat, …
  superchargedSlots: string[]; // "R2C3": row 2, column 3 of the inventory grid
  slotLabels: Record<string, string>; // what sits in a supercharged slot ("R2C3" → "Infra-Knife"), 3.14.3
  notes: string; // Markdown
  createdAt: string;
}

export const ROLE_SUGGESTIONS = ['Flagship', 'Scrap spare', 'Combat', 'Scanner', 'Mining', 'Exploration'];
export const MAX_SLOT = 12; // rows and columns beyond any inventory grid are typos
export const MAX_LABEL = 40;

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const SLOT = /^R(\d{1,2})C(\d{1,2})$/i;

// "R2C2 r2c3, R3C7" → ["R2C2", "R2C3", "R3C7"]; anything else is reported back so the editor can say what it skipped.
export function parseSlots(input: string): { slots: string[]; rejected: string[] } {
  const slots: string[] = [];
  const rejected: string[] = [];
  for (const token of input.split(/[\s,;]+/).filter(Boolean)) {
    const match = SLOT.exec(token);
    const row = Number(match?.[1]);
    const col = Number(match?.[2]);
    if (!match || row < 1 || col < 1 || row > MAX_SLOT || col > MAX_SLOT) rejected.push(token);
    else if (!slots.includes(`R${String(row)}C${String(col)}`)) slots.push(`R${String(row)}C${String(col)}`);
  }
  return { slots, rejected };
}

// The grid drawn for a set of slots: big enough for every one, and at least `min` (a card's preview is 3 × 8; the
// editor's picker starts at 4 rows, where the wiki says supercharged slots almost always are, and slotRules' width).
export function slotGrid(
  slots: string[],
  min = { rows: 3, cols: 8 }
): { rows: number; cols: number; marked: Set<string> } {
  let rows = min.rows;
  let cols = min.cols;
  for (const slot of slots) {
    const match = SLOT.exec(slot);
    if (!match) continue;
    rows = Math.max(rows, Number(match[1]));
    cols = Math.max(cols, Number(match[2]));
  }
  return { rows, cols, marked: new Set(slots) };
}

// Tapping a cell in the picker: marks or unmarks it. Kept in reading order (row, then column).
export function toggleSlot(slots: string[], slot: string): string[] {
  const next = slots.includes(slot) ? slots.filter(item => item !== slot) : [...slots, slot];
  const key = (item: string) => {
    const match = SLOT.exec(item);
    return Number(match?.[1]) * 100 + Number(match?.[2]);
  };
  return next.sort((a, b) => key(a) - key(b));
}

// Labels are kept only for marked slots: clearing a slot drops its label too.
function slotLabels(value: unknown, slots: string[]): Record<string, string> {
  const labels: Record<string, string> = {};
  if (!isPlainObject(value)) return labels;
  for (const slot of slots) {
    const label = text(value[slot]).slice(0, MAX_LABEL);
    if (label) labels[slot] = label;
  }
  return labels;
}

export function normalizeGear(value: unknown): GearItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item, index) => {
    if (!isPlainObject(item)) return [];
    const name = text(item.name);
    if (!name) return [];
    const id = typeof item.id === 'string' && SAFE_ID.test(item.id) ? item.id : `gear-${String(index)}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const slots = Array.isArray(item.superchargedSlots)
      ? parseSlots(item.superchargedSlots.filter(slot => typeof slot === 'string').join(' ')).slots
      : [];
    return [
      {
        id,
        kind: GEAR_KINDS.find(kind => kind === item.kind) ?? 'starship',
        name,
        class: text(item.class),
        type: text(item.type),
        role: text(item.role),
        superchargedSlots: slots,
        slotLabels: slotLabels(item.slotLabels, slots),
        notes: typeof item.notes === 'string' ? item.notes : '',
        createdAt: typeof item.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt)) ? item.createdAt : ''
      }
    ];
  });
}

// Fixed, so two devices that migrate the same fleet separately make identical records and sync matches them by id.
const MIGRATED_AT = '2026-10-27T00:00:00.000Z';

// The pre-3.14 `fleet` notes ({ primaryStarship, salvageStarship, multiTools[] }) → gear records.
export function gearFromFleet(fleet: unknown): GearItem[] {
  if (!isPlainObject(fleet)) return [];
  const entries: [string, GearKind, string, unknown][] = [
    ['fleet-flagship', 'starship', 'Flagship', fleet.primaryStarship],
    ['fleet-spare', 'starship', 'Scrap spare', fleet.salvageStarship],
    ...(Array.isArray(fleet.multiTools) ? fleet.multiTools : []).map((tool, i): [string, GearKind, string, unknown] => [
      `fleet-tool-${String(i + 1)}`,
      'multitool',
      '',
      tool
    ])
  ];
  return normalizeGear(
    entries.flatMap(([id, kind, role, item]) => {
      if (!isPlainObject(item)) return [];
      const notes = [item.role && role ? `Role: ${text(item.role)}` : '', item.layoutNotes, item.status, item.notes]
        .map(text)
        .filter(Boolean)
        .join('\n\n');
      return [
        {
          id,
          kind,
          name: item.name,
          class: item.class,
          type: item.type,
          role: role || text(item.role),
          superchargedSlots: item.superchargedSlots,
          notes,
          createdAt: MIGRATED_AT
        }
      ];
    })
  );
}

// Fleet's order: flagships first, then the other starships, then Multi-Tools; newest last within each.
export function gearOrder(items: GearItem[]): GearItem[] {
  const rank = (item: GearItem) => (/flagship/i.test(item.role) ? 0 : item.kind === 'starship' ? 1 : 2);
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.i - b.i)
    .map(e => e.item);
}

// The current class in what the player wrote: "A" → A, "A -> S" → S (the class it was upgraded to), "Royal" → null.
export function classLetter(value: string): 'C' | 'B' | 'A' | 'S' | null {
  const letters = value.toUpperCase().match(/\b[SABC]\b/g);
  const last = letters?.at(-1);
  return last === 'C' || last === 'B' || last === 'A' || last === 'S' ? last : null;
}

export interface SlotRules {
  columns: number; // the technology grid's width
  maxRows: number; // the largest grid this kind (and class, when the wiki says) can reach
  maxSlots: number | null; // its technology slots at most, when the wiki says
  supercharged: number | null; // how many supercharged slots it has, when the wiki says
  fixed: string[] | null; // where they are, for a kind whose positions are the same for every player
  sources: CitedFact[]; // the facts behind these rules, for their Codex links
}

const FALLBACK = { columns: 10, maxRows: MAX_SLOT };

// The picker's limits for one item, from the cited facts (wiki/facts.json). Without a fact the picker keeps its own
// generous limits and says nothing: a rule shows only with the wiki sentence behind it.
export function slotRules(facts: FactsFile | null, kind: GearKind, cls: string): SlotRules {
  const letter = classLetter(cls);
  const sources: CitedFact[] = [];
  const max = getFact(
    facts,
    kind === 'multitool' ? 'multitool-tech-max' : kind === 'exosuit' ? 'exosuit-tech-max' : 'starship-tech-max'
  );
  let { columns, maxRows } = FALLBACK;
  let maxSlots: number | null = null;
  // A class the wiki gives no number for (a C-class ship) can be upgraded, so the largest number known applies.
  const slots =
    max &&
    ((letter && max.value.slots[letter]) || max.value.slots.any || Math.max(0, ...Object.values(max.value.slots)));
  if (max && slots) {
    columns = max.value.columns;
    maxRows = Math.ceil(slots / columns);
    maxSlots = slots;
    sources.push(max.fact);
  }
  let supercharged: number | null = null;
  let fixed: string[] | null = null;
  if (kind === 'exosuit') {
    const count = getFact(facts, 'supercharged-fixed-count');
    const positions = getFact(facts, 'exosuit-supercharged-slots');
    if (count) {
      supercharged = count.value;
      sources.push(count.fact);
    }
    if (positions) {
      fixed = positions.value;
      sources.push(positions.fact);
    }
  } else {
    const perClass = getFact(facts, 'supercharged-per-class');
    if (perClass && letter) {
      supercharged = perClass.value[letter];
      sources.push(perClass.fact);
    }
  }
  return { columns, maxRows, maxSlots, supercharged, fixed, sources };
}

// What the marked slots disagree with. A warning, never a block: the wiki can be wrong, and the player's screen wins.
export function slotWarnings(
  rules: SlotRules,
  slots: string[]
): { tooMany: boolean; outside: string[]; offPreset: string[] } {
  return {
    tooMany: rules.supercharged !== null && slots.length > rules.supercharged,
    outside: slots.filter(slot => {
      const match = SLOT.exec(slot);
      return Number(match?.[1]) > rules.maxRows || Number(match?.[2]) > rules.columns;
    }),
    offPreset: rules.fixed ? slots.filter(slot => !rules.fixed?.includes(slot)) : []
  };
}
