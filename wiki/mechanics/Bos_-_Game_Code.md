---
title: "Bos - Game Code"
category: "mechanics"
kind: "mechanic"
summary: "Bos - Game Code is a code reference page."
pageId: 185750
revId: 543151
revTimestamp: "2020-06-19T05:44:03Z"
version: "ExoMech"
obsolete: false
status: "current"
source: "https://nomanssky.fandom.com/wiki/Bos_-_Game_Code"
license: "CC BY-NC-SA 3.0 (No Man's Sky Wiki contributors)"
data: {"fields":{},"recipes":[]}
---

# Bos - Game Code

**Bos - Game Code** is a code reference page.

## Summary

This page contains game code extracted from the [[Update 1.77|Visions 1.77]] release. It relates to the definition of the [[Bos]] [[Genus]].

## 1.77 Bos Game Code

### Spider

"GcCreatureData.xml"
      "Id" value="SPIDER"
      "OnlySpawnWhenIdIsForced" value="False"
      "Genus" value="BOS"
      "ForceType" value="GcCreatureTypes.xml"
        "CreatureType" value="None"

      "MoveArea" value="Ground"
      "MinScale" value="0.4"
      "MaxScale" value="12"
      "Rarity" value="GcRarity.xml"
        "Rarity" value="Uncommon"

      "PredatorProbabilityModifier" value="GcCreatureRoleFrequencyModifier.xml"
        "CreatureRoleFrequencyModifier" value="Normal"

      "HerbivoreProbabilityModifier" value="GcCreatureRoleFrequencyModifier.xml"
        "CreatureRoleFrequencyModifier" value="Normal"

### Float Spider

"GcCreatureData.xml"
      "Id" value="FLOATSPIDER"
      "OnlySpawnWhenIdIsForced" value="False"
      "Genus" value="BOS"
      "ForceType" value="GcCreatureTypes.xml"
        "CreatureType" value="None"

      "MoveArea" value="Ground"
      "MinScale" value="0.4"
      "MaxScale" value="12"
      "Rarity" value="GcRarity.xml"
        "Rarity" value="Rare"

      "PredatorProbabilityModifier" value="GcCreatureRoleFrequencyModifier.xml"
        "CreatureRoleFrequencyModifier" value="Normal"

      "HerbivoreProbabilityModifier" value="GcCreatureRoleFrequencyModifier.xml"
        "CreatureRoleFrequencyModifier" value="Normal"

## Additional information

This section of the game file remains the same in [[ExoMech]]. It should be noted that Bosaquatica, listed here as **Crabs** are not truly of the Bos genera, as shown above, rather they are one of several separate, unnamed genera lumped together under **Unknown**.
