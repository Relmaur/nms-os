---
title: "Portal address"
category: "mechanics"
kind: "mechanic"
summary: "A Portal address describes the location of a Portal."
pageId: 71934
revId: 1341121
revTimestamp: "2026-10-25T09:11:40Z"
version: "Companions"
obsolete: false
status: "current"
source: "https://nomanssky.fandom.com/wiki/Portal_address"
license: "CC BY-NC-SA 3.0 (No Man's Sky Wiki contributors)"
data: {"fields":{},"recipes":[]}
---

# Portal address

A **Portal address** describes the location of a Portal.

## Summary

A **Portal address** is a character string that describes the location of a [[Portal]] when using the portal coordinates system. Every [[planet]] and [[moon]] has exactly one portal on them and every portal has its own unique address. When an address is entered into a charged portal the charged portal establishes a wormhole to the portal at the entered address, allowing for two-way travel through the portal. A portal address is a necessary component of portal travel, which allows for visiting any planet in the [[galaxy]].

## Acquiring Addresses

A portal's address can be learned by interacting with a charged [[Portal Terminal]] and requesting it. Alternatively they can be extrapolated by converting the coordinates given by a [[Signal Booster]]. The only difference between the two methods is that the first yields the address of a portal on a specific body in the system, whereas code conversion yields the general address of the [[star system]] without a fixed Planet Index.

## Address Format

A portal address is a string of twelve [[glyph]] characters. Just as an Earth address details streets and cities, a portal address details planets, star systems, and [[region|regions]] of space within a galaxy. Reading from left to right, the first character in a portal address is the **Planet Index** and it is the address for a specific planet or moon within the given star system. The next three characters combine as the **Solar System Index**, giving the address for a specific star system within the given region. The final characters combine as the  position, which is the specific address for a region in a galaxy. The Voxel position can be further broken into Y, Z, and X coordinates with its eight characters representing height-width-length, YY-ZZZ-XXX (see Voxel Position section, below).

It is not necessary to have discovered all sixteen glyphs to use a portal for travel. Some addresses require only a few glyphs. The benefit to discovering all the glyphs is to have unlimited options.

## Portal Coordinates System

The **portal coordinates system** is one of two coordinates systems within No Man's Sky. It is responsible for the addresses of portals. Understanding the portal coordinates system requires knowledge of how galaxies are charted.

### Planet Index

A **Planet Index** is assigned to each celestial body according to their  in relation to the entry point of the warp drive. Unless a system is [[Uncharted system|uncharted]] this spot is always marked by the local space station. Due to the moon's aphelion being larger than their local planet's, their planet indexes are higher, with the moon closer to the planet coming first.

Locations outside the gravity well of a planet or moon use <code>PlanetIndex=0</code>. If this specific planet index is used inside a portal address, the Atlas Interface will correct the destination and send you to the first planet (with <code>PlanetIndex=1</code>). The same happens for values above the number of celestial bodies in a system. While there are sixteen possible values (0 to F) the limit for celestial bodies in No Man's Sky is <code>PlanetIndex=6</code>. This can range from two planets with two moons each to six planets overall.

For example, the star system [[AGT Vytralaw 51]] has five planets and one moon. Entering the portal address  (003DFD6ACF8C) will result in sending you to the planet Vytralaw Boilireg, which has a portal address of  (103DFD6ACF8C).

### Solar System Index

A **Solar System Index** is a group of three hexadecimal numbers assigned to each star system in a region. It always begins at <code>SolarSystemIndex=000</code> and counts up by one for every star system. Even though <code>PlanetIndex=0</code> has no assigned planet, it always leads to the first portal of a system at <code>PlanetIndex=1</code> (due to the error proximity mechanic). <code>SolarSystemIndex=000</code> is a theoretically viable index pointing to the first system of any region and actually differs from <code>SolarSystemIndex=001</code>. However, Index 0 is depreciated inside the portal system and thus also leads to <code>SolarSystemIndex=001</code> after an error proxomity teleport. Despite that, any given region has potentially 4096 (decimal) star systems, ranging from <code>SolarSystemIndex=000</code> up to <code>SolarSystemIndex=FFE</code> (FFF would flip and default to 000). Given how the game works, most of these are inaccessible systems, commonly known as [[Phantom star|Phantom stars]]. These can only be reached through save-editing or through a base-terminus already built there.

Based on ingame evidence, every region has a <code>SolarSystemIndex=079</code> and <code>SolarSystemIndex=07A</code> (with the former always being a [[Black Hole]] and the latter always having an [[Atlas Interface]]). As a result, every region has at least 122 (decimal) star systems.

The lowest documented number of accessible star systems is not 122, instead to date, the documented region with the fewest number of systems is [[Sokoli Mass]], with a total of 218 (decimal) systems. [[Delta Majoris Hilbert Umbra]], with a <code>SolarSystemIndex=0DA</code>, is the last one. DMHU is a so-called [[Shadow Star]] which unlike a phantom star can be accessed ingame, but not per portal.

The largest possible number of accesible star systems in a region is unknown. To date the [[Baadossm Anomaly]] of Euclid is the region confirmed with the highest system count at 584 (decimal). <code>SolarSystemIndex=248</code> is the coordinate code for its last but undocumented system **Omemon-Uze IV**. [https://nomanssky.gamepedia.com/File:20210527202204_1.jpg](https://nomanssky.gamepedia.com/File:20210527202204_1.jpg)

Note that there may remain undocumented regions with a higher or lower number of systems.

### Voxel Position

Galaxies are oblong cuboids with a radius of 819.000 light-years and a height of 51.000 light-years. They have equal length and width but less than equal height and do not fall into perfect angles, at least visually. Based on those figures the proportions of each region are roughly 400ly x 400 ly x 400 ly (565 ly for a plane's diagonal and 695 ly for the cube's diagonal). A galaxy's portal network has a radius of 2048 regions and a height of 128 regions.

Galaxies can be divided into upper and lower halves with the dividing plane being called the "Galactic Plane". They can also be divided into north and south halves as well as west and east halves. These divisions provide a virtual compass rose for the galaxy. The cardinal directions, traveling clockwise around the compass, are **north**, **beta**, **east**, **delta**, **south**, **gamma**, **west**, and **alpha**. The termination points for the cardinal points are called "**poles**" and for the ordinal points are called "**spirals**". The extreme upper wall is the "Majoris" and the extreme lower wall is the "Minoris".

The portal coordinates system places its origin (where X, Y, Z = 0) at the centre of each galaxy. The X-axis is length, the Y-axis is height, and the Z-axis is width. Note that the [[Galaxy Centre]] is devoid of stars for 3,000 light years in all directions, which constitues approximately 7 axial and 4 diagonal voxels. The nearest reliable address to the centre of every galaxy needs 6 glyphs.
<br>

**Y Values:Y values begin at 01 and end at FF (Decimal: 255). They increase in the upper direction beginning from the galactic centre. When the **Upper Pole** is reached at Y=7F (Decimal: 127) then numbering resumes from the **Lower Pole** with Y=81 (Decimal: 129) and increasing as it nears centre. The coordinate Y=80 (Decimal: 128) is the border between the edges in the portal network and it is not used. Entering it as part of an address will return the Y=81 result instead.**
Up:  -
Down:  -

**X values:X values begin at 001 and end at FFF (Decimal: 4095). They increase in the eastern direction beginning from centre. When the **Eastern Pole** is reached at X=7FF (Decimal: 2047) then numbering resumes from the **Western Pole** with X=801 (Decimal: 2049) and increasing as it nears centre. The coordinate X=800 (Decimal: 2048) is the border between edges in the portal network and it is not used. Entering it as part of an address will return the X=801 result instead.**
East:  -
West:  -

**Z values:Z values begin at 001 and end at FFF (Decimal: 4095). They increase in the southern direction beginning from centre. When the **Southern Pole** is reached at Z=7FF (Decimal: 2047) then numbering resumes from the **Northern Pole** with Z=801 (Decimal: 2049) and increasing as it nears centre. The coordinate X=800 (Decimal: 2048) is the border between edges in the portal network and it is not used. Entering it as part of an address will return the X=801 result instead.**
South:  -
North:  -

## Galactic Coordinates System

The [[Galactic Coordinates]] system is a second coordinate system within No Man's Sky. It is responsible for the coordinates seen on signal boosters, which can be converted to portal addresses. The coordinates appear as a string of alpha and hexadecimal characters divided by colons. To convert coordinates visit the **No Man's Sky Portals Decoder** at [nmsportals.github.io](https://nmsportals.github.io/) and select the "Galactic Coordinates" tab. There, omit entry of the left-most alpha characters and only enter the sixteen hexadecimal characters to get a valid portal address. Note that converting Galactic Coordinates always results in <code>PlanetIndex=0</code>.

The Galactic Coordinate system uses Alpha Minoris for its zero point, where 0000:0000:0000:0000 begins. Their values begin at the bottom northwest corner of the chart and end at the top southeast corner, at Delta Majoris, where it ends at 0FFE:00FE:0FFE:0000. Just as the glyph sequence jumps X=800, Y=80, and Z=800 as the edge of the portal network, the same detail or 0FFF:00FF:0FFF:0000 is left out for the coordinate system to match the galaxy's dimensions.

### Table of conversions

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

## Extreme Coordinates

The following table lists addresses for the star systems that should be at the extreme points in every galaxy. These addresses might result in error proximity teleports, but they do the job and are easy to remember.

| Location | Address |
| --- | --- |
| Upper Pole |   |
| Near Centre |   |
| Lower Pole |   |
| North Pole (galactic plane) |   |
| East Pole (galactic plane) |   |
| South Pole (galactic plane) |   |
| West Pole (galactic plane) |   |
| Alpha Spiral (majoris) |   |
| Alpha Spiral (galactic plane) |   |
| Alpha Spiral (minoris) |   |
| Beta Spiral (majoris) |   |
| Beta Spiral (galactic plane) |   |
| Beta Spiral (minoris) |   |
| Gamma Spiral (majoris) |   |
| Gamma Spiral (galactic plane) |   |
| Gamma Spiral (minoris) |   |
| Delta Spiral (majoris) |   |
| Delta Spiral (galactic plane) |   |
| Delta Spiral (minoris) |   |
