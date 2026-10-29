// The Log tab's segmented control, at the top of Systems, Fleet and Notes. It's navigation, not a setting, so the
// open segment takes the scanner cyan of the active tab (with aria-current), not the emerald of a selected segment.
// Map joins it when the Map screens land.
import { useSection } from '../shell/section-store.ts';

const SEGMENTS = [
  { section: 'systems', label: 'Systems' },
  { section: 'gear', label: 'Fleet' },
  { section: 'notes', label: 'Notes' }
] as const;

export function LogSegment() {
  const open = useSection();
  return (
    <nav
      aria-label="Log sections"
      className="flex gap-1 p-1 rounded-control bg-slate-ground border border-hairline max-w-xl"
    >
      {SEGMENTS.map(({ section, label }) => (
        <a
          key={section}
          href={`#${section}`}
          aria-current={open === section ? 'page' : undefined}
          className={`flex-1 h-[34px] rounded-segment border flex items-center justify-center text-control transition-colors duration-[var(--duration-micro)] ${
            open === section
              ? 'bg-scanner-cyan-tint border-scanner-cyan-edge text-scanner-cyan-text'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
