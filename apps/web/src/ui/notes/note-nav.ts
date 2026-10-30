// Notes open on their own screen (#note/<id>, design 11). A new one gets its id here, starting pinned to where it was
// begun (a book, Home), and is stored only once it has a title or some text: leaving a blank one leaves nothing.
import { newId } from '@atlas/core/systems-model';

let fresh: { id: string; pins: string[] } | null = null;

export function openNote(id: string): void {
  location.hash = `#note/${encodeURIComponent(id)}`;
}
export function newNote(pins: string[] = []): void {
  fresh = { id: newId('note'), pins };
  openNote(fresh.id);
}
/** The pins a just-begun note starts with, or null when `id` isn't one (a reload forgets it: it was never stored). */
export const freshPins = (id: string): string[] | null => (fresh?.id === id ? fresh.pins : null);
