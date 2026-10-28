---
title: "Planetary Chart (inhabited outpost)"
category: "products"
kind: "product"
summary: "A map of a nearby planet. An inhabited outpost of some kind has been marked."
pageId: 143831
revId: 1299314
revTimestamp: "2026-03-24T05:20:16Z"
version: "Echoes"
obsolete: false
status: "current"
source: "https://nomanssky.fandom.com/wiki/Planetary_Chart_(inhabited_outpost)"
license: "CC BY-NC-SA 3.0 (No Man's Sky Wiki contributors)"
data: {"fields":{"image":"PRODUCT.STARCHART.BUILDING.png","category":"Curiosity","type":"Cartographic Data","value":"3,200.0","release":"Echoes"},"value":3200,"recipes":[]}
---

# Planetary Chart (inhabited outpost)

## Quick Facts

- **Category:** Curiosity
- **Type:** Cartographic Data
- **Value:** 3,200.0
- **Added in:** Echoes

**Planetary Chart** is a curiosity.

## Summary

**Planetary Chart** is a [[curiosity]].

## Game description

A map of a nearby [[planet]]. An inhabited outpost of some kind has been marked.

Select the map and use Plot Route (// (PC/PS/XB)) to pin the location in your Exosuit display.

New maps can be gained by exchanging [[Navigation Data]] with a [[Space Station]] [[Cartographer]].

## Source

Randomly obtained from all types of [[Planetary Chart]] from the Cartographer on a space station in exchange for Navigation Data.

## Additional information

Internal game identifier is <code>STARCHART_C</code>.

This item indicates the location of one of the following locations type in the current star system:
- [[Colossal Archive]] (10% chance)
- [[Shelter]] (16% chance)
- [[Trade Outpost]] (10% chance)
- [[Minor Settlement]] (30% chance)
- [[Transmission Tower]] (16% chance)
- [[Observatory]] (16% chance)
- [[Paleontological Dig]] (?% chance)

Chances are extracted from the 3.46 version of the reward table (<code>METADATA/REALITY/TABLES/REWARDTABLE.MBIN</code>) entry <code>R_STARCHART_C</code>.

There can only be one location type active at the same time in the same system. Using a chart generating an event already triggered will cancel the use of it, and send an error message to the user, effectively not consuming the chart.

This can be exploited to trigger a certain location type repeatedly with a 100% chance, leaving all other events active.

The chart will try to locate a nearby location type within approximately 20ks. While within a planet and outside the nearby location type range (20ks+), it will try to point to a random location of the same type within the planet.

## Bugs

Sometimes when trying to locate a Shelter, the game will locate another point of interest such as: [[Holographic Comms Tower]], [[Sentinel Pillar]], [[Habitable Base]] etc.

## Release history

- [[Beyond]] - Added as a curiosity.
- [[Synthesis]] - Icon changed, now has a small icon indicating its purpose.
