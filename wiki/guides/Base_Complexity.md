---
title: "Base Complexity"
category: "guides"
pageId: 47592
summary: "Base Complexity is a value assigned to a Player base that is calculated by the type and quantity of Structure types that are currently built."
source: "https://nomanssky.fandom.com/wiki/Base_Complexity"
license: "CC BY-SA 3.0 (No Man's Sky Wiki contributors)"
updated: "2026-10-27"
---

# Base Complexity

## Summary

**Base Complexity** is a value assigned to a Player base that is calculated by the type and quantity of Structure types that are currently built.

Once the limit is reached, you will be unable to build anything else unless you delete components to reduce your complexity. Each buildable component has a specific value. There has been testing done by Reddit user *Nazgutek* and an almost complete list of Base Complexity Item Values has been posted.

## Purpose

Although unconfirmed, the purpose of base complexity may be to restrict the size of a Player base so there is minimal effect on PC and Console performance.

## Addition Information

Base complexity will not be displayed until a specific complexity is reached (approximately 75%) *(needs to be confirmed)*. If you build beyond the limit (See PC Editing), you may receive errors if you try and upload your base to the Steam Workshop. Also if base sharing is enabled, visitors to your base may not see it as intended. Both Planet and Freighter bases use these complexity values, although they are calculated separately.

## PC Editing

While on PC, it is possible to extend the limits of complexity as well as remove building restrictions. Eg: Able to build outside of the default confines of both planet and freighter bases. **Always make backups and use caution when editing any files.**

**Default file location:** *C:\Program Files (x86)\Steam\steamapps\common\No Man's Sky\Binaries\SETTINGS\TKGRAPHICSSETTINGS.MXML*

Values to edit:

| Text Description | Default Value | Edited Value | Effect |
| --- | --- | --- | --- |
| RemoveBaseBuildingRestrictions | false | true | Changing this value to 'true' will allow you to build anywhere. |
| BaseBuildingLimit | 2000 | 10000 | Example value; this can be any number up to 2^18 (262,144). Increasing it will allow much larger bases. (Use caution on slower PC's, may cause a crash.). |
