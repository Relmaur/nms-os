// The Traveller Card's art (c11, Current): drawn from the log by @atlas/core/current. Each line is drawn twice when
// animated: a faint base, and a short bright pulse that runs along it in the direction of the current (.cf in
// theme.css; reduced motion leaves only the base, brighter).
import { memo } from 'react';
import type { CurrentArt } from '@atlas/core/current';

const S = 300;

export const CardArt = memo(function CardArt({
  art,
  animate = true,
  className = ''
}: {
  art: CurrentArt;
  animate?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox={`0 0 ${String(S)} ${String(S)}`} aria-hidden="true" className={`block ${className}`}>
      {art.lines.map((line, i) => (
        <g key={i}>
          <path
            className="cb"
            d={line.d}
            fill="none"
            stroke={line.colour}
            strokeOpacity={animate ? 0.34 : 0.5}
            strokeWidth={0.7}
            strokeLinecap="round"
          />
          {animate && (
            <path
              className="cf"
              d={line.d}
              pathLength={100}
              fill="none"
              stroke={line.colour}
              strokeOpacity={0.95}
              strokeWidth={1.1}
              strokeLinecap="round"
              style={{ animationDuration: `${line.duration.toFixed(2)}s`, animationDelay: `${line.delay.toFixed(2)}s` }}
            />
          )}
        </g>
      ))}
      {art.islands.map(island => (
        <circle
          key={island.name}
          cx={island.x}
          cy={island.y}
          r={island.r}
          fill="none"
          stroke={island.colour}
          strokeOpacity={0.75}
          strokeDasharray="3 3"
        />
      ))}
      {art.eyes.map((eye, i) => (
        <g key={i}>
          <circle
            cx={eye.x}
            cy={eye.y}
            r={eye.r * 2.4}
            fill="none"
            stroke={eye.colour}
            strokeOpacity={0.35}
            strokeWidth={0.6}
          />
          <circle cx={eye.x} cy={eye.y} r={eye.r} fill={eye.colour} />
        </g>
      ))}
      {!art.vortices && (
        // Day one: nothing logged, so a dashed star at the heart and a field with no eye.
        <g>
          <circle cx={S / 2} cy={S / 2} r={9} fill="none" stroke="#94a3b8" strokeDasharray="3 3" />
          <circle cx={S / 2} cy={S / 2} r={3} fill="#475569" />
        </g>
      )}
    </svg>
  );
});
