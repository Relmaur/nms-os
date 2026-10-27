---
title: "Update 1.04"
category: "updates"
kind: "update"
summary: "Update 1.04 is the second update to No Man's Sky."
pageId: 6180
revId: 1181311
revTimestamp: "2024-01-28T19:31:35Z"
version: "Release"
obsolete: false
status: "current"
source: "https://nomanssky.fandom.com/wiki/Update_1.04"
license: "CC BY-SA 3.0 (No Man's Sky Wiki contributors)"
data: {"fields":{"image":"Nms-release-book-cover-by-qjimbo.png","date":"18 August 2016","platform":"PS4, PC","link":"Update 1.04 on nomanssky.com","previous":"1.03","next":"1.05","release":"Initial Release","steam":"1284085","gog":"2.1.0.3"},"recipes":[]}
---

# Update 1.04

## Quick Facts

- **Release date:** 18 August 2016
- **Platforms:** PS4, PC
- **Previous:** 1.03
- **Next:** 1.05
- **Added in:** Initial Release

**Update 1.04** is the second update to No Man's Sky.

## Summary

**Update 1.04** is the second update to [[No Man's Sky]] released on 18 August 2016 to both PlayStation 4 and PC.

## Official Patch Notes

Patch notes taken from [Release Log](https://www.nomanssky.com/pc-patch-1-04/).

### NOTES

The focus of patch 1 was to add greater support for more hardware. Either specific hardware configs, or hardware outside our min spec. We want as many people to be able to play as possible, and these were our most reported issues.

### AMD Phenom support

- Game is now confirmed working on Phenom CPUs.
- Thousands of lines of assembly have been rewritten to support AMD CPUs. The game code no longer relies on anything above SSE 2,
- Havok Physics has also now created new libs for us to add Phenom support.

### Alt-Tab has improved

- Some systems/configs were crashing or not pausing correctly on Alt Tab. This should now be resolved.

### Improved performance

- On CPUs with 4 threads or fewer, performance has been improved.
- On CPUs with exactly 8 threads, performance has also been significantly improved.

### Framerate stuttering due to shader caching

- Framerate was initially stuttering due to shaders not being correctly cached by the GPU on some systems. We have replaced the GPU caching system. You may notice some stutter during the Galactic Map intro to the game (the very first time you run), but it should be smoother from then on. This is particularly true on ATI cards.

### Max FPS cap

- On some CPU/GPU configurations, setting Max FPS to 60 or 30 was not giving 60 or 30 FPS (causing stuttering). This has been fixed.

### Radeon 6xxx

- Added support for this GPU, which doesn't support OpenGL 4.5 fully.

### Save corruption

- Solution to try to prevent saves getting corrupted no matter what's going on in background processes (see Patch 3 below, where we also are attempting to recover corrupted saves).

### Intel GPU detection

- We do not currently support Intel GPUS. We are working on this for a future patch, to expand our min spec.
- In the meantime, the game will now let you know if you are trying to run with an unsupported GPU. This will hopefully flag for some users that their high end GPU has not been selected.

### Gsync

- Gsync has been disabled by default, which was causing an issue for some users

### Mouse smoothing

- Generally this is most helpful for players with sub-30 FPS.
- Smoothing on mouse movement has been improved to prevent hitching or stuttering, and is now adjustable through the Options menu in "Mouse Smoothing".
- It defaults to off. If you feel micro stutters in framerate affecting controls, feel free to turn this up. If you feel the framerate is "slow" or "lumpy", please make sure that this is turned off
