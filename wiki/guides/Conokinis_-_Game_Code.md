---
title: "Conokinis - Game Code"
category: "guides"
pageId: 185751
summary: "Conokinis - Game Code is a code reference page."
source: "https://nomanssky.fandom.com/wiki/Conokinis_-_Game_Code"
license: "CC BY-SA 3.0 (No Man's Sky Wiki contributors)"
updated: "2026-10-27"
---

# Conokinis - Game Code

**Conokinis - Game Code** is a code reference page.

## Summary

This page contains game code extracted from the Visions 1.77 release. It relates to the definition of the Conokinis genus.

## 1.77 Conokinis Game Code

### Beetle

GcCreatureData.xml"

"Id" value="BEETLE"
"OnlySpawnWhenIdIsForced" value="False"
"Genus" value="CONOKINIS"
"ForceType" value="GcCreatureTypes.xml"
"CreatureType" value="Beetle"

"MoveArea" value="Ground"
"MinScale" value="1"
"MaxScale" value="1"
"Rarity" value="GcRarity.xml"
"Rarity" value="Common"

"PredatorProbabilityModifier" value="GcCreatureRoleFrequencyModifier.xml"
"CreatureRoleFrequencyModifier" value="Normal"

"HerbivoreProbabilityModifier" value="GcCreatureRoleFrequencyModifier.xml"
"CreatureRoleFrequencyModifier" value="Normal"

"Data"
GcCreatureSwarmData.xml"
"MinCount" value="10"
"MaxCount" value="10"
"SwarmMovementSpeed" value="10"
"SwarmMovementRadius" value="10"
"SwarmMovementType" value="Circle"
"Coherence" value="0.2"
"Alignment" value="0.4"
"Spacing" value="2"
"Follow" value="1"
"Range" value="30"
"MaxbankingAmount" value="0"
"TurnRequiredForMaxBanking" value="0.3"
"MaxPitchAmount" value="0"
"UpwardMovementForMaxPitch" value="0.3"
"MaxSpeed" value="15"
"AlignTime" value="0.2"
"SpringSmoothTime" value="0.3"
"RepelList"
