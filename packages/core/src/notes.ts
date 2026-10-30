// The player's own notes (state key `notes`, docs/state-schema.md, ADR-0007): Markdown, each one pinnable to Home or
// to a Guide book, so a player's findings sit next to the general playbook on their own app only.
import { SAFE_ID, isPlainObject } from './util.ts';
import { BOOKS } from './guides.ts';

export interface Note {
  id: string;
  title: string;
  body: string; // Markdown
  pins: string[]; // where it shows besides the Notes list: 'home', 'book1' … 'book6', or 'gear:<id>' (a ship's screen)
  createdAt: string;
  updatedAt: string;
}

export const PIN_PLACES: { key: string; label: string }[] = [
  { key: 'home', label: 'Home' },
  ...BOOKS.map(book => ({ key: book.key, label: `Book ${book.numeral}` }))
];
const PLACES = new Set(PIN_PLACES.map(place => place.key));
// A note linked to a ship, Multi-Tool or Exosuit (the redesign's Linked notes) is pinned to `gear:<its id>`.
export const gearPin = (id: string): string => `gear:${id}`;
const isPin = (pin: string): boolean => PLACES.has(pin) || (pin.startsWith('gear:') && SAFE_ID.test(pin.slice(5)));
export const MAX_NOTE_CHARS = 100_000; // a long guide is ~20k; past this a paste went wrong

const date = (value: unknown): string => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : '');

export function normalizeNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item, index) => {
    if (!isPlainObject(item)) return [];
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const body = typeof item.body === 'string' ? item.body.slice(0, MAX_NOTE_CHARS) : '';
    if (!title && !body.trim()) return [];
    const id = typeof item.id === 'string' && SAFE_ID.test(item.id) ? item.id : `note-${String(index)}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const pins = Array.isArray(item.pins)
      ? [...new Set(item.pins.filter((pin): pin is string => typeof pin === 'string' && isPin(pin)))]
      : [];
    const createdAt = date(item.createdAt);
    return [
      { id, title: title || 'Untitled note', body, pins, createdAt, updatedAt: date(item.updatedAt) || createdAt }
    ];
  });
}

// Most recently changed first.
export function notesPinnedTo(notes: Note[], place: string): Note[] {
  return notes.filter(note => note.pins.includes(place)).sort(byNewest);
}
export const notesForGear = (notes: Note[], id: string): Note[] => notesPinnedTo(notes, gearPin(id));

// The notes after linking exactly `ids` to one gear item: others linked to it are unlinked. Only changed notes are new
// objects, so the caller can tell which to save.
export function linkNotes(notes: Note[], gearId: string, ids: string[]): Note[] {
  const pin = gearPin(gearId);
  return notes.map(note => {
    const linked = note.pins.includes(pin);
    const wanted = ids.includes(note.id);
    if (linked === wanted) return note;
    return { ...note, pins: wanted ? [...note.pins, pin] : note.pins.filter(item => item !== pin) };
  });
}
export function byNewest(a: Note, b: Note): number {
  return (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0);
}

export function searchNotes(notes: Note[], query: string): Note[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return notes
    .filter(note => {
      const hay = `${note.title}\n${note.body}`.toLowerCase();
      return words.every(word => hay.includes(word));
    })
    .sort(byNewest);
}

// A Markdown file → a note's title and body: the first "# heading" is the title (and leaves the body), else the
// file name without its extension.
export function noteFromMarkdown(markdown: string, fileName = ''): { title: string; body: string } {
  const text = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const heading = /^\s*#\s+([^\n]+)\n*/.exec(text);
  const fallback = fileName.replace(/\.(md|markdown|txt)$/i, '').trim();
  return {
    title: (heading?.[1] ?? fallback).trim() || 'Untitled note',
    body: (heading ? text.slice(heading[0].length) : text).trim().slice(0, MAX_NOTE_CHARS)
  };
}

// One line for lists and search results: the body's text without Markdown marks.
export function noteExcerpt(note: Note, length = 140): string {
  return note.body
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target)
    .replace(/[#*_`>|[\]()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, length);
}
