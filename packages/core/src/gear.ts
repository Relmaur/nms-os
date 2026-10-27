// The player's ships and Multi-Tools (state key `gear`, docs/state-schema.md, ADR-0007): their own records, which
// replaced the hard-coded fleet notes. Before 3.14.0 the log held a free-form `fleet` object; gearFromFleet() turns it
// into records once, and `fleet` itself is carried along untouched.
import { SAFE_ID, isPlainObject } from './util.ts';

export const GEAR_KINDS = ['starship', 'multitool'] as const;
export type GearKind = (typeof GEAR_KINDS)[number];

export interface GearItem {
  id: string;
  kind: GearKind;
  name: string;
  class: string; // S, A, B, C, or what the player wrote ("A -> S")
  type: string; // Sentinel Interceptor, Royal, …
  role: string; // Flagship, Scrap spare, Combat, …
  superchargedSlots: string[]; // "R2C3": row 2, column 3 of the inventory grid
  notes: string; // Markdown
  createdAt: string;
}

export const ROLE_SUGGESTIONS = ['Flagship', 'Scrap spare', 'Combat', 'Scanner', 'Mining', 'Exploration'];
export const MAX_SLOT = 12; // rows and columns beyond any inventory grid are typos

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
// editor's picker is 4 × 10, the first 40 coordinates where Book III says supercharged slots spawn).
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
        kind: item.kind === 'multitool' ? 'multitool' : 'starship',
        name,
        class: text(item.class),
        type: text(item.type),
        role: text(item.role),
        superchargedSlots: slots,
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

// Home's order: flagships first, then the other starships, then Multi-Tools; newest last within each.
export function gearOrder(items: GearItem[]): GearItem[] {
  const rank = (item: GearItem) => (/flagship/i.test(item.role) ? 0 : item.kind === 'starship' ? 1 : 2);
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => rank(a.item) - rank(b.item) || a.i - b.i)
    .map(e => e.item);
}
