---
title: "Universal Address"
category: "guides"
pageId: 438392
summary: "Universal Addresses are an address method for game objects."
source: "https://nomanssky.fandom.com/wiki/Universal_Address"
license: "CC BY-SA 3.0 (No Man's Sky Wiki contributors)"
updated: "2026-10-27"
---

# Universal Address

**Universal Addresses** are an address method for game objects.

## Summary

*See: *Galactic Coordinates
*See: *Portal address
*See: *Planetary coordinates, Analysis Visor
*See: *Planet#Planetary_Astrodynamics

**Universal Addresses** are a combination of Galaxy number and **Galactic Coordinates** used in-game and save files. They can be shown in-game with **Hyperspace Navigation Beacons**,

These internal values are used by No Man's Sky to calculate the location of various objects in the game, including Systems, Planets, Regions, Players, Bases, Message Modules, etc.

This value is calculated in-game by keeping various factors in mind based on the object's 3D location in a galaxy.

- Galaxy index
- Region index
- Solar System Index
- Planet Index

## History

Universal Addresses were initially discovered in-game after the discovery of Hyperspace Navigation Stations, which were discovered to be broadcasting the UA of the current system. Prior to this, the existence of this value was only known via Save Editing and Modding.

## Decoding

The 16 hex digits represent the Universal Address of the current system. This is similar to the System's Portal address but it includes two buffer digits at the beginning, and the Galaxy Index in positions 7 and 8.

It can be decoded as follows: [??][P][SSS][GG][YY][ZZZ][XXX] – (? = Unknown / P = Planet Index / S = Star System Index /G = Galaxy / Y = Height / Z = Width / X = Length).

### Example

The Hyperspace Navigation Station located in the Zancyil XVI system / Portal address: 012E0E45A7B3012E0E45A7B3 / (012E0E45A7B3) of the Euclid galaxy, broadcasts a Universal Address of 00012E000E45A7B3:

- 00 = Buffer
- 0 = Planetary Index (Planet 0 or System)
- 12E = Star System Index
- 00 = Reality (Galaxy) Index (Euclid is the first galaxy and is represented by 00 in hexadecimal)
- 0E = Height (YY)
- 45A = Width (ZZZ)
- 7B3 = Length (XXX)

## Usage

Universal Addresses can be used for iterating through an entire region, helping one set out naming guidelines for a region. Universal Addresses can also be used for transporting players around the universe using save editing, or for modding purposes.

## Identification and Validation

In the game files, the Hyperspace Navigation Stations are referred to as a "WEIRD_OBJ17" and "CLOCK_POI".

When encountered in-game, the encounter is pulled from various game files as follows:

**Information in SpacePOIMissionTable.MBIN (converted to EXML)**

- Line 12327 - The mission
- Line 1256 - The mission reference to the comm message (message is "UI_CLOCK_POI_MSG").

**Information in NMS_Loc6_English**

- Line 911 - message "UI_CLOCK_POI_MSG"
- Line 929 - output text with an ID value "UI_CLOCK_POI_LANG". The associated Text is "... %UA%..."
- Lines 8801-8824 - references to loading the UA or Universal Address for Screenshots.

Within the game files, you can find references to both the Pre-Living Ships Void Egg mission, and a Mission to the Galactic Hub to earn the **Pilgrim** title. Both of these missions contains a reference to a 16-digit UA address that directly maps, as detailed below, to the Portal Addresses of those respective systems

Additionally while Bosse19 was in the Ialmendra galaxy, they found a Station broadcasting 000106EF0352EC5C. When they followed the portal address 01060352EC5C in the Euclid galaxy they found a Station broadcasting 000106000352EC5C. The only difference between these two broadcasts is digits 7 and 8; in Ialmendra they are EF for the 240th galaxy and in Euclid they are 00 for the first galaxy.
