// What the Notes screens share (designs 10, 11): where a note is pinned and its tags, as pills, and its date.
import { PIN_PLACES, type Note } from '@atlas/core/notes';
import type { GearItem } from '@atlas/core/gear';
import { KINDS } from '../gear/kinds.ts';

export const TOP_BUTTON =
  'w-11 h-11 rounded-control bg-slate-ground border border-control-edge grid place-items-center text-ink hover:border-control-edge-hover transition-colors duration-[var(--duration-micro)]';
const PILL =
  'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border text-[11px] font-semibold tracking-[0.04em]';
export const TAG =
  'inline-flex items-center h-6 px-2.5 rounded-full bg-scanner-cyan-tint border border-scanner-cyan-edge text-[12px] font-medium text-[#a5f3fc]';

/** "28 Oct": the list and the note's footnote. */
export const shortDate = (iso: string): string =>
  Date.parse(iso) ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';

// Home in emerald (it's on the player's first screen), books and ships in slate; a ship's pill opens it.
export function PinPills({ note, gear }: { note: Note; gear: GearItem[] }) {
  const places = PIN_PLACES.filter(place => note.pins.includes(place.key));
  const ships = gear.filter(item => note.pins.includes(`gear:${item.id}`));
  if (!places.length && !ships.length && !note.tags.length) return null;
  return (
    <ul aria-label="Pinned to and tags" className="flex flex-wrap gap-1.5">
      {places.map(place => (
        <li
          key={place.key}
          className={`${PILL} ${
            place.key === 'home'
              ? 'bg-ready-emerald-tint border-ready-emerald-edge text-ready-emerald-text'
              : 'bg-slate-ground border-control-edge text-ink-soft'
          }`}
        >
          <i
            className={`ph-bold ${place.key === 'home' ? 'ph-push-pin' : 'ph-book-bookmark'} text-[12px]`}
            aria-hidden="true"
          />
          {place.label}
        </li>
      ))}
      {ships.map(item => (
        <li key={item.id}>
          <a
            href={`#ship/${encodeURIComponent(item.id)}`}
            className={`${PILL} bg-slate-ground border-control-edge text-ink-soft hover:text-ink-bright`}
          >
            <i className={`ph-bold ${KINDS[item.kind].icon} text-[12px]`} aria-hidden="true" />
            {item.name}
          </a>
        </li>
      ))}
      {note.tags.map(tag => (
        <li key={tag} className={TAG}>
          <span className="sr-only">Tag </span>
          {tag}
        </li>
      ))}
    </ul>
  );
}
