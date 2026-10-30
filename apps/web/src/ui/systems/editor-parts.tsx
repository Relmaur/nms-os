// Form parts of the system editor (design 06): fields, labels and segmented tracks.
import { useId, type ReactNode } from 'react';

export const FIELD =
  'w-full h-11 rounded-control border border-control-edge bg-slate-ground px-3.5 text-base md:text-sm text-ink-bright placeholder:text-ink-disabled focus:border-scanner-cyan-edge-strong focus:outline-hidden';
export const LABEL_FIELD = 'flex flex-col gap-1.5 text-caption text-ink-soft';

export type Option = [value: string, label: string, extra?: ReactNode, name?: string];

/**
 * One choice of a few, as segments in a track. With `clearable`, tapping the chosen segment again clears it: the
 * design has no "Unknown" segment for these, and an unknown value must stay possible.
 */
export function Segments({
  label,
  hideLabel = false,
  value,
  options,
  onChange,
  clearable = false,
  rows = 1
}: {
  label: string;
  hideLabel?: boolean;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  clearable?: boolean;
  rows?: number;
}) {
  const labelId = useId();
  const perRow = Math.ceil(options.length / rows);
  const tracks = Array.from({ length: rows }, (_, row) => options.slice(row * perRow, (row + 1) * perRow));
  return (
    <div className="flex flex-col gap-1.5">
      <p id={labelId} className={hideLabel ? 'sr-only' : 'text-caption text-ink-soft'}>
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-col gap-2">
        {tracks.map((track, row) => (
          <div key={row} className="flex gap-1 p-1 rounded-control bg-slate-ground border border-hairline">
            {track.map(([key, text, extra, name]) => {
              const on = value === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={name}
                  onClick={() => {
                    onChange(on && clearable ? '' : key);
                  }}
                  className={`flex-1 min-w-0 h-9 px-1 rounded-segment flex items-center justify-center gap-1.5 text-[13px] font-semibold transition-colors ${
                    on
                      ? 'bg-[rgba(16,185,129,0.18)] text-[#d1fae5] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.45)]'
                      : 'text-ink-soft hover:text-ink-bright'
                  }`}
                >
                  {extra}
                  <span className="truncate tracking-tight">{text}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
