// A galaxy's small spiral glyph in its tide colour: the galaxy list (30) and the galaxy picker (31).
import { spiralDots, type GalaxyJourney } from '@atlas/core/map';

/** A galaxy's small spiral in its tide colour. */
export function GalaxyGlyph({
  galaxy,
  colour,
  size = 40
}: {
  galaxy: Pick<GalaxyJourney, 'name' | 'type'>;
  colour: string;
  size?: number;
}) {
  const c = size / 2;
  const r = c - 4;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx={c} cy={c} r={c - 1} fill="#070c18" stroke={colour} strokeOpacity={0.5} />
      {spiralDots(galaxy.name, galaxy.type, size < 30 ? 50 : 110).map((dot, k) => (
        <circle key={k} cx={c + dot.x * r} cy={c + dot.y * r} r={dot.r * 0.8} fill={colour} fillOpacity={0.7 * dot.o} />
      ))}
      <circle cx={c} cy={c} r={r * 0.06 + 0.4} fill="#fff7d6" fillOpacity={0.8} />
    </svg>
  );
}
