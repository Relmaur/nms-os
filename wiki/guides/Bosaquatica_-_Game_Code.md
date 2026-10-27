---
title: "Bosaquatica - Game Code"
category: "guides"
pageId: 190306
summary: "Bosaquaticas - Game Code is a code reference page."
source: "https://nomanssky.fandom.com/wiki/Bosaquatica_-_Game_Code"
license: "CC BY-SA 3.0 (No Man's Sky Wiki contributors)"
updated: "2026-10-27"
---

# Bosaquatica - Game Code

**Bosaquaticas - Game Code** is a code reference page.

## Summary

This page contains game code extracted from the Visions 1.77 release. It relates to the definition of the Bosaquatica genus.

## 1.77 Crab Game Code

### Crab

"GcCreatureData.xml"

"Id" value="CRAB"
"OnlySpawnWhenIdIsForced" value="False"
"Genus" value="UNKNOWN"
"ForceType" value="GcCreatureTypes.xml"
"CreatureType" value="Crab"

"MoveArea" value="Ground"
"MinScale" value="0.4"
"MaxScale" value="12"
"Rarity" value="GcRarity.xml"
"Rarity" value="Common"

"PredatorProbabilityModifier" value="GcCreatureRoleFrequencyModifier.xml"
"CreatureRoleFrequencyModifier" value="Normal"

"HerbivoreProbabilityModifier" value="GcCreatureRoleFrequencyModifier.xml"
"CreatureRoleFrequencyModifier" value="Normal"

## Additional information

This section of the game file remains the same in ExoMech. It should be noted that Bosaquatica, listed here as **Crabs** are not truly of the Bos genera, rather they are one of several separate, unnamed genera lumped together under Unknown. This led to Bosaquatica being formerly recognized as a distinct genus.

While Crabs are shown here to have the same size range as Bos, it is believed their size is limited later at the point of spawn by the biome code, much the same as how size ranges for cave spawns is restricted, accounting for their much smaller size range seen in game.
