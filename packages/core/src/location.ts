// Where a system sits in its galaxy, from its portal address. Both address formats and the conversion between them
// are the wiki's (Portal address and Galactic Coordinates pages, "Table of conversions"): a portal address is
// P SSS YY ZZZ XXX with the galaxy's centre at 0,0,0; galactic coordinates are XXXX:YYYY:ZZZZ:SSSS counted from a
// corner. Distances need the region size, a cited fact ('region-light-years'), so they are passed in, never assumed.
import { z } from 'zod';

export interface Voxel {
  planet: number;
  system: number;
  /** Regions from the centre, signed: east, up and south are positive. */
  x: number;
  y: number;
  z: number;
}

const hex = (value: number, digits: number) => value.toString(16).toUpperCase().padStart(digits, '0');
// A portal coordinate wraps at its pole (X=7FF east, then 801 west): the upper half of the range is negative.
const signed = (value: number, size: number) => (value >= size / 2 ? value - size : value);

/** The parts of a 12-digit portal address, or null when it isn't one. */
export function parsePortal(glyphs: string): Voxel | null {
  if (!/^[0-9A-F]{12}$/i.test(glyphs)) return null;
  const part = (from: number, to: number) => parseInt(glyphs.slice(from, to), 16);
  return {
    planet: part(0, 1),
    system: part(1, 4),
    y: signed(part(4, 6), 0x100),
    z: signed(part(6, 9), 0x1000),
    x: signed(part(9, 12), 0x1000)
  };
}

/** "21A4F03A0E10" → "060F:006F:0B9F:01A4", the form a signal booster shows (without its letters). */
export function portalToGalactic(glyphs: string): string | null {
  const voxel = parsePortal(glyphs);
  if (!voxel) return null;
  // The wiki's table: galactic 07FF is portal X 000, galactic 007F is portal Y 00.
  const x = (voxel.x + 0x7ff + 0x1000) % 0x1000;
  const y = (voxel.y + 0x7f + 0x100) % 0x100;
  const z = (voxel.z + 0x7ff + 0x1000) % 0x1000;
  return [hex(x, 4), hex(y, 4), hex(z, 4), hex(voxel.system, 4)].join(':');
}

/**
 * Galactic coordinates as a portal address. Accepts the booster's string with or without its leading letters
 * ("HUKYA:046A:0081:0D6D:0038") and any separators; the planet index the coordinates can't hold is passed in.
 * Null when the text isn't four groups inside the galaxy (X and Z up to 0FFE, Y up to 00FE, as the wiki says).
 */
export function galacticToPortal(coords: string, planet = 0): string | null {
  const groups = coords
    .trim()
    .replace(/^[A-Z]+[:\s-]+/i, '')
    .split(/[:\s-]+/)
    .filter(Boolean);
  if (groups.length !== 4 || !groups.every(group => /^[0-9A-F]{1,4}$/i.test(group))) return null;
  const [x, y, z, system] = groups.map(group => parseInt(group, 16)) as [number, number, number, number];
  if (x > 0xffe || y > 0xfe || z > 0xffe || system > 0xfff || planet < 0 || planet > 0xf) return null;
  return [
    hex(planet, 1),
    hex(system, 3),
    hex((y - 0x7f + 0x100) % 0x100, 2),
    hex((z - 0x7ff + 0x1000) % 0x1000, 3),
    hex((x - 0x7ff + 0x1000) % 0x1000, 3)
  ].join('');
}

/** Straight-line distance from the galaxy's centre, in regions. */
export function regionsFromCentre(voxel: Voxel): number {
  return Math.hypot(voxel.x, voxel.y, voxel.z);
}

/** "421k ly", "2,400 ly": the light years from the centre, given the cited size of a region. */
export function formatLightYears(regions: number, lyPerRegion: number): string {
  const ly = regions * lyPerRegion;
  return ly >= 10000
    ? `${Math.round(ly / 1000).toLocaleString('en')}k ly`
    : `${Math.round(ly).toLocaleString('en')} ly`;
}

/** A portal address grouped for reading, as the game's glyph rows are long: "21A4 F03A 0E10". */
export function groupGlyphs(glyphs: string): string {
  return glyphs.replace(/(.{4})(?=.)/g, '$1 ');
}

// The 256 galaxies, numbered as the wiki numbers them (each Galaxy page's "order"), written by the wiki indexer to
// wiki/galaxies.json so the galaxy picker doesn't need the whole dataset.
export const GalaxySchema = z.object({
  n: z.int().min(1).max(256),
  name: z.string(),
  type: z.string(),
  path: z.string()
});
export const GalaxiesFileSchema = z.object({ schema: z.literal(1), galaxies: z.array(GalaxySchema) });
export type Galaxy = z.infer<typeof GalaxySchema>;
