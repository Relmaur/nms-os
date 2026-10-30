import { expect, test } from 'vitest';
import {
  formatLightYears,
  galacticToPortal,
  groupGlyphs,
  parsePortal,
  portalToGalactic,
  regionsFromCentre
} from '../src/location.ts';

// The wiki's own worked examples (Galactic Coordinates, "Decoding Portal Strings"): signal booster ↔ portal string.
const WIKI_VECTORS: [galactic: string, portal: string][] = [
  ['046A:0081:0D6D:0038', '00380256EC6B'],
  ['0E8F:007F:01D8:0079', '0079009D9690']
];

test('portal address ↔ galactic coordinates, on the wiki’s worked examples', () => {
  for (const [galactic, portal] of WIKI_VECTORS) {
    expect(portalToGalactic(portal)).toBe(galactic);
    expect(galacticToPortal(galactic)).toBe(portal);
  }
  // The design's example, both ways, keeping its planet index.
  expect(portalToGalactic('21A4F03A0E10')).toBe('060F:006F:0B9F:01A4');
  expect(galacticToPortal('060F:006F:0B9F:01A4', 2)).toBe('21A4F03A0E10');
});

test('the wiki’s table of conversions: the poles and the centre', () => {
  // Galactic 0000 is portal 801 (X, Z) and 81 (Y); 07FF and 007F are 000 and 00; 0FFE and 00FE are 7FF and 7F.
  expect(galacticToPortal('0000:0000:0000:0001')).toBe('000181801801');
  expect(galacticToPortal('07FF:007F:07FF:0001')).toBe('000100000000');
  expect(galacticToPortal('0FFE:00FE:0FFE:0001')).toBe('00017F7FF7FF');
});

test('booster strings with their letters, loose spacing and bad input', () => {
  expect(galacticToPortal('HUKYA:046A:0081:0D6D:0038')).toBe('00380256EC6B');
  expect(galacticToPortal(' 46a 81 d6d 38 ')).toBe('00380256EC6B');
  expect(galacticToPortal('0FFF:0000:0000:0001')).toBeNull(); // past the galaxy's edge
  expect(galacticToPortal('0000:00FF:0000:0001')).toBeNull();
  expect(galacticToPortal('046A:0081:0D6D')).toBeNull();
  expect(portalToGalactic('21A4F03A0E1')).toBeNull();
  expect(parsePortal('XYZ4F03A0E10')).toBeNull();
});

test('position and distance from the centre', () => {
  expect(parsePortal('00380256EC6B')).toEqual({ planet: 0, system: 0x38, y: 2, z: 0x56e, x: 0xc6b - 0x1000 });
  expect(regionsFromCentre({ planet: 1, system: 1, x: 3, y: 0, z: 4 })).toBe(5);
  expect(formatLightYears(1052.4, 400)).toBe('421k ly');
  expect(formatLightYears(6, 400)).toBe('2,400 ly');
  expect(groupGlyphs('21A4F03A0E10')).toBe('21A4 F03A 0E10');
});
