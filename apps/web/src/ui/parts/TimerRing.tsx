// The timer ring (DESIGN.md): how far a timer has run, in its kind's colour while it counts down (cyan, amber for a
// crop), a full emerald ring with a check once it's done. Decorative: the time and state beside it carry the meaning.
const R = 22;
const LENGTH = 2 * Math.PI * R;

export type RingTone = 'cyan' | 'amber' | 'rose';
const TONE: Record<RingTone, { stroke: string; text: string }> = {
  cyan: { stroke: 'var(--color-scanner-cyan-glow)', text: 'var(--color-scanner-cyan-pale)' },
  amber: { stroke: '#fcd34d', text: '#fde68a' },
  rose: { stroke: '#fb7185', text: '#fecdd3' }
};

export function TimerRing({
  progress,
  done,
  size = 50,
  tone = 'cyan',
  label
}: {
  progress: number;
  done: boolean;
  size?: number;
  tone?: RingTone;
  /** Shown inside the ring while it runs ("78%"). */
  label?: string;
}) {
  const colours = TONE[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" aria-hidden="true" className="shrink-0">
      {done ? (
        <>
          <circle cx="26" cy="26" r={R} fill="none" stroke="var(--color-ready-emerald-lit)" strokeWidth="5" />
          <path
            d="M17 26.5l6 6 12-13"
            fill="none"
            stroke="var(--color-ready-emerald-lit)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle cx="26" cy="26" r={R} fill="none" stroke="var(--color-hairline)" strokeWidth="5" />
          <circle
            cx="26"
            cy="26"
            r={R}
            fill="none"
            stroke={colours.stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={LENGTH}
            strokeDashoffset={LENGTH * (1 - Math.min(1, Math.max(0, progress)))}
            transform="rotate(-90 26 26)"
          />
          {label && (
            <text
              x="26"
              y="29"
              textAnchor="middle"
              fill={colours.text}
              fontFamily="JetBrains Mono, monospace"
              fontSize="9"
            >
              {label}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
