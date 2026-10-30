---
title: "Galactic Coordinates"
category: "mechanics"
kind: "mechanic"
summary: "''This article is about galactic coordinates. For information on other types of coordinates, see: - Planetary coordinates (shown in the Analysis Visor) - Geographic coordinates - ''Universal Address"
pageId: 23691
revId: 1336007
revTimestamp: "2026-10-04T12:55:34Z"
version: "Swarm"
obsolete: false
status: "current"
source: "https://nomanssky.fandom.com/wiki/Galactic_Coordinates"
license: "CC BY-NC-SA 3.0 (No Man's Sky Wiki contributors)"
data: {"fields":{},"recipes":[]}
---

# Galactic Coordinates

''This article is about galactic coordinates. For information on other types of coordinates, see:
- *[[Planetary coordinates]]* (shown in the [[Analysis Visor]])
- *[[Planet|Geographic coordinates]]*
- ''[[Universal Address]]

**Galactic Coordinates** are points used in navigation.

## Summary

**Galactic Coordinates** are the points that can be extracted from a [[Signal Booster]] data string and used in a [[Coordinate Plotting App]] to acquire your [[Journal:Afwings 4|Galactic Coordinate Position]] in a [[No Man's Sky]] galaxy.

When placed, a Signal Booster will display a **Coordinate data string**, such as the one in the video below: **HUKYA:046A:0081:0D6D:0038**

## Decoding Signal Booster String

| Var name: | Scanner ID | X | Y | Z | Solar System Index |
| --- | --- | --- | --- | --- | --- |
| Substring | HUKYA | 046A | 0081 | 0D6D | 0038 |
| range for game values | (4-5 letters) | 0..FFF | 0..FF | 0..FFF | 1..2FF<br>3E8..429 |

The intent of the full 12 values is to pin-point an individual planet. The Galactic Coordinates are vital for [[Portal]] Travel.

There are multiple tools for doing conversion between glyphs and coordinates, see the  [[#External Links|External Links]] section on this page.

The three sections in the middle (046A:0081:0D6D) can be entered into a Coordinate Plotting App to extrapolate an x, y, z position which will give the location of a Region.

The last section (0038) is a Solar System Index and is necessary for galactic scale navigation to a specific Star System. In this case it would lead to the 56th system in that Region. (Hex 0038 = 56 Decimal)
The SSI can go up to 2FF for star systems before [[Worlds Part II]]; the new [[System colours|purple coloured]] star systems added in that update use IDs between 3E8 and 429. Other values refer to [[Phantom Star|Phantom Stars]] and are not reachable through normal gameplay.

Lastly, the very first value references a specific planet. (Note: If the system has 6 bodies, then the first value will range from 1 to 6, one for each body. Every value outside of that range will lead to planet 1.)

- An index of 0079 designates a black hole system.
- an index of 007A designates an Atlas Station

In the game, the x, y and z (called **VoxelX**,**VoxelY** and **VoxelZ**) coordinates, together with the SolarSystemIndex, are internally referred to as **GalacticAddress**.

These Galactic Coordinates are crucial for long range galactic navigation. To learn more, visit the [[Journal:Afwings 1|iVc Navigator's Guide]]. When determining the [[Quadrant]] for a set of Galactic Coordinates, the X block defines the position along the [[Journal:Afwings 4|Prime gHorizon]] and the Z block defines the position along the [[Journal:Afwings 4|Prime gMeridian]].

## Decoding Portal Strings

| Var name: | Planet | Solar System Index | Y | Z | X |
| --- | --- | --- | --- | --- | --- |
| Substring | 1 | 079 | 00 | 9D9 | 690 |
| range for game values | 0..F | 001...2FF | 00..FF | 000...FFF | 000...FFF |

Portal travel autocorrects Solar System Index of 000 as 001, leaving 000 locations as [[Shadow Star]] systems.
Not only is the portal string mixed around compared to the signal booster, there are adjustments to translate the X, Y, and Z coordinates. The portal code uses the galactic center for 0,0,0 rather than a corner. From signal booster to portal, a value is Added or Subtracted. The lower half of each range has a constant Added value, while the upper half has a constant Subtracted value.

| Conversion | X | Y | Z | Planet | SSI |
| --- | --- | --- | --- | --- | --- |
| Signal Booster 1 | 046A | 0081 | 0D6D | 0 | 038 |
| translate | +801 | -7F | -7FF |   |   |
| Portal 1 | C6B | 02 | 56E | 0 | 038 |
| Signal Booster 2 | 0E8F | 007F | 01D8 | 0 | 079 |
| translate | -7FF | -7F | +801 |   |   |
| Portal 2 | 690 | 00 | 9D9 | 0 | 079 |

### Conversion Table

| Galactic | Portal |   | Galactic | Portal |
| --- | --- | --- | --- | --- |
| (Y = bottom) | (X = west)<br>(Z = north) |   |   |   |
| 0000 | 81 | 0000 | 801 |   |
| 0001 | 82 | 0001 | 802 |   |
| ... | ... |   |   |   |
| 007E | FF | 07FE | FFF |   |
| **007F** | **00** | **07FF** | **000** |   |
| 0080 | 01 | 0800 | 001 |   |
| ... | ... |   |   |   |
| 00FD | 7E | 0FFD | 7FE |   |
| 00FE | 7F | 0FFE | 7FF |   |
| (Y = top) | (X = east)<br>(Z = south) |   |   |   |

## Wiki Use

### Coords Template

When entering coordinates on a wiki page, use the **coords** macro in the following format (the *alpha* parm is optional):
<pre>

</pre>

will create this:

### Coordinates and Glyph Generation Template

When entering coordinates on a wiki page, and you also want it to automatically display glyphs, use the **CoordGlyphConvert** macro in the following format (the *alpha* parm is not to be used):
<pre>

</pre>

will create this:

## Additional Information

- [[Coordinates Guide]] is a reference page for exchanging coordinates.
- There are also [[planetary coordinates]] which provide similar navigation for planets.
- [Portal Decoder](https://nmsportals.github.io/) is a special tool to convert between Galactic Coordinates and [[portal address]].
- Research and documentation of the original meaning of the signal booster galactic coordinate string was first made by the [[IVc Project]] on behalf of the [[Alliance of Galactic Travellers]] and then documented for the entire NMS [[Civilized space]] community in the [[Pathfinder]] era.

## Related Articles

- [[Glyph]]
- [[Portal]]
- [[Portal address]]
- [[Planetary coordinates]]

## External Links

- [AGT Glyph and Coordnate Decoder, Generator, Civ Finder, and Randomizer](https://agt-glyph-generator-824948114609.asia-southeast1.run.app/)
- [Bravecapercat Updated Portal Decoder (Support for Purple)](https://bravecapercat2.github.io/nmsportals.github.io/)
- [Legacy Portal&lt;->Galactic address decoder](https://nmsportals.github.io)
- [Alternative decoder (Specially for Purple Systems)](https://glyphs.had.sh/)
