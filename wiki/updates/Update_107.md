---
title: "Update 1.07"
category: "updates"
kind: "update"
summary: "Update 1.07 is the fifth update to No Man's Sky."
pageId: 7672
revId: 1181377
revTimestamp: "2024-01-29T12:32:21Z"
version: "Release"
obsolete: false
status: "current"
source: "https://nomanssky.fandom.com/wiki/Update_1.07"
license: "CC BY-NC-SA 3.0 (No Man's Sky Wiki contributors)"
data: {"fields":{"image":"Nms-release-book-cover-by-qjimbo.png","dateps":"27 Aug 2016","datepc":"2 Sep 2016","platforms":"PS4, PC","link":"Update 1.07 on nomanssky.com","previous":"1.06","next":"1.08","release":"Initial Release","steam":"1314359","gog":"2.4.0.6"},"recipes":[]}
---

# Update 1.07

## Quick Facts

- **Previous:** 1.06
- **Next:** 1.08
- **Added in:** Initial Release

**Update 1.07** is the fifth update to No Man's Sky.

## Summary

**Update 1.07** is the fifth update to [[No Man's Sky]] released on 27 August 2016 to Playstation 4 and 2 September 2016 on PC.

## Official Patch Notes

Patch notes taken from [Release Log](https://www.nomanssky.com/pc-patch-1-07/).

### Objectives and stuck without Hyper-drive issues

- Player no longer able to redeem your pre-order [[ship]] at a point which would then prevent you learning the [[hyperdrive|hyper-drive]] [[blueprint]] (and if you have done this, we save you).
- Player no longer able to bypass being sent to find hyper-drive tech by reloading a save in game at a very specific point.

### Getting stuck in the world

- Fixed a couple of low repro bugs that could result in you falling through the world and getting stuck underground.
- A raycast in some [[space station|space stations]] could hit a very specific point that would put the player inside the floor.
- Fixed an issue that would cause your ship to be thrown in the sky at high speed when taking off (in rare cases could in turn lead to getting stuck).
- Fixed an issue that would cause your ship to get stuck in terrain and prevent you from taking off, if the player managed to out run generation of terrain LOD 1, and land inside an overhang.

### Gameplay

- Some players were unable to achieve the extreme survival [[journey milestone]], this has been resolved.
- Fixed an issue where some players had some [[technology]] types being reported as "already known" when they weren't actually known.
- Under some circumstances a message was sometimes misinforming you that you learnt a blueprint when you hadn't, this has been fixed now.
- It was possible you could use up all available slots for [[Waypoints]] on the [[Galactic Map|galaxy map]] and be unable to set new waypoints. This is much better now.
- There was a bug that could cause objective markers to disappear when you loaded a previous save. This is fixed now.
- Fixed a rare issue when scanning [[species|creatures]] that would cause all [[planet|planets]] to show as 100% complete even if you had only completed one.

### Save / load

- Fixed a bug what could cause some corrupt save games to not be loaded, this is now fixed.
- Fixed an issue where saves made with the system clock set in the future could cause problems.

### Crash fixes

- Fixed a crash that would sometimes happen when warping into a system with a space battle in progress.
- Fixed a crash that could happen when interacting with an NPC.

### Tweaks and improvements

- It is now easier to scan flying creatures.
- Fixed height and weight stats being the wrong way around for creatures.
- [[Gek]] towers can no longer be interacted with repeatedly.
- The 'You have unredeemed items' message will now only show for the first 5 minutes.
- Fixed getting 0% charge on [[Photon Cannon]] when buying a new ship and constantly being prompted to charge it.
- Reduce Suit VO for life support warnings and only do life support VO on 25% and 50%.
- Fixed grave being transferred to the new [[star system]] after you warp.
- Fixed [[Toxin Suppressor Theta|toxic protection 3 (theta)]] from having the wrong name.
- Fixed incorrect marking of sea [[cave|caves]] under floating islands.
- Turning down music and SFX volume in the options will now work correctly (mutes the VO also).
- If you change ship or [[multi-tool]] and then revert to previous save the ship should now be the one you had at the time.
- [[Atlas]] station collision improvements to prevent you from bumping into them too much.
- Fix for the [[star|stars]] not being discarded during load/warp (causing duplicate stars).

### PC only issues

- Editing the settings file and corrupting it could cause the game to crash. Instead of crashing it will now revert back to the default settings.
- The [[inventory]] screen now works correctly regardless of resolution.
- Added error message for older CPUs without SSE3 support.
- Synchronise frame capping with the first vsync (removes some framerate issues).
- Added steam id to login call to help track down some login issues.
- Fixed the X key size on the galaxy map.
- If you press Tab+P in quick succession, the game paused and didn’t let you out of it.
- Fixed a performance issue by defaulting your texture resolution to a sensible value based on available GPU memory.
