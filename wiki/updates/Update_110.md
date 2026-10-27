---
title: "Update 1.10"
category: "updates"
kind: "update"
summary: "Update 1.10 is the eighth update to No Man's Sky."
pageId: 9700
revId: 1336258
revTimestamp: "2026-10-04T18:06:40Z"
version: "Foundation"
obsolete: false
status: "current"
source: "https://nomanssky.fandom.com/wiki/Update_1.10"
license: "CC BY-SA 3.0 (No Man's Sky Wiki contributors)"
data: {"fields":{"image":"Nms-foundation-book-cover.png","date":"26 November 2016","platform":"PS4, PC","link":"Update 1.10 on nomanssky.com","previous":"1.09.1","next":"1.12","release":"Foundation","steam":"1481116","gog":"2.7.0.9"},"recipes":[]}
---

# Update 1.10

## Quick Facts

- **Release date:** 26 November 2016
- **Platforms:** PS4, PC
- **Previous:** 1.09.1
- **Next:** 1.12
- **Added in:** Foundation

**Update 1.10** is the eighth update to No Man's Sky.

## Summary

**Update 1.10** is the eighth update to [[No Man's Sky]] released on 26 November 2016 to Playstation 4 and PC. Size was roughly 1.3 GB file size.

It is better known as the [[The Foundation Update]], the first major update to the original release.

## Official Patch Notes

Patch notes taken from [Release Log](https://www.nomanssky.com/foundation-update/).

### General gameplay

- Fixed technology becoming instantly fully charged when repaired
- Fixed ship appearing on incorrect pad in [[space station]] after loading
- Added interactable objects that required certain tech to collect
- Added shootable objects that require certain tech to mine
- Rebalanced [[resource]] availability and technology charge requirements
- Fixed initial game flow - where travelling to space too quickly after visiting the [[monolith]] could prevent the first atlas station notification appearing
- Prevented player being prompted to scan for buildings before leaving the system after visiting the monolith
- Prevented laser and melee attacks while in space from attempting to edit terrain
- Improved calculation of resources received when mining terrain
- Renamed Signal Scanners to [[Signal Booster|Signal Boosters]]
- Signal booster objects updated to search for playable bases, suit upgrade pods, and mineable resources
- Removed signal booster from being distributed on terrain, as player can now build them
- Improved accuracy of environment detection, fixing cases where it rained inside [[cave|caves]]
- Fixed galactic [[Waypoints]] not loading correctly across saves
- Removed [[AtlasPass v1]] requirement from doors in stations
- Suit upgrade pods are no longer spawned in stations
- Suit upgrade pods can now only be used once
- Fixed collision in anomaly that was causing issues when exiting larger ships
- Increased the number of different NPC character models generated per system
- Fixed the game always remaining in day time for players who began their save prior to patch [[Update 1.03|1.03]]
- Fixed a potential crash in foliage instance renderer

### Localisation

- Fixed stats page in asian languages
- Fixed multiple issues with asian language formatting
- Multiple improvements and fixes to localisation text in all languages

### UI

- Added new icons for specific types of primary resources
- Fixed health bars not appearing on some targets
- Added hazard and life support drain indicators
- Fixed mission messages not appearing in a timely fashion
- Beacons now notify the player that they will save the game
- Fixed crash when creature IK animations were updated under certain conditions on the discovery screen
- Improved navigation in discovery UI
- Massive speed improvements to browsing huge discovery lists
- Increased size of discovery storage
- Added option to load "Earliest" previous save in Options menu
- Fixed weapon naming
- Added icon to remind players of the reload button when weapon is empty
- Multiple fixes for viewing discoveries

### PS4

- Added photo mode
- Large optimisations to the engine to accommodate base building

### PC

- Added support for up to 8 mouse buttons
- Fixed better order position history for mouse smoothing
- Fixed bug where setting gamma to zero gave a fully bright rather than fully dark image
- Fixed hard-limiting on save sizes, with appropriate warning about free space on boot
- Player is now notified when shaders are being loaded
- Fixed occasional crash on exit
- Fixed performance of trail renderer for some AMD cards
- Large optimisations to the engine to accommodate base building

### Generation

- Added [[biome]]-specific plants
- Adopted new method of distributing resource plants on terrain, for more lifelike clumps of plants
- Improved distribution of plant life across all terrain types
- Introduced visual differentiation of red, green and blue [[star system|star systems]]
- Introduced new mineable terrain resources found only in [[System colours|red, green and blue]] star systems
- Reduced average building frequency
- Introduced planets with elevated building density
- Introduced planets with no buildings or sentient life
- Increased the proportion of lush and tropical planets
- Decreased the proportion of lifeless planets
- Fixed bug where multiple ships could appear, overlapping, at the player's start scene
- Prevented certain building types being incorrectly placed underwater
- Prevented multiple buildings occasionally being placed in overlapping positions
- Prevented buildings occasionally being placed intersecting with the terrain
- Improved and altered per-planet terrain resource generation, improving gameplay and visuals

### Creatures

- Fixed elevation cache mismatches, causing errors in creature knowledge and pathing
- Fixed slow memory leak in creature role allocation
- Improved creature animation speeds
- Fixed issues where some creatures turns had the incorrect frame count
- Fixed occasional crash when interacting with creatures

### Atmospherics

- Increased proportion of vibrant blue skies
- Corrected cloud levels for clear skies
- Improved average cloud level settings
- Fixed cloud rendering while flying in your ship
- Improved atmosphere depth when transitioning to space
- Increased fidelity of atmosphere rendering on nearest planet
- Improved atmospheric fog as you fly to a planet
- Improved fog method for planets seen on the horizon

### Terrain

- Improved terrain generation algorithms
- Improved and extended blend areas between different terrain noise types
- Terrains now generate more open spaces
- Smaller features now appear at nearer LODs to improve visuals in the distance
- Fixed objects being placed on incorrect terrain material types
- Improved resolution of distant planet terrain
- Decreased differences between planet as seen from space and actual planet terrain
- Fixed seams on planets when seen from space
- Improvements to terrain material selection and terrain material blending
- Terrain generation priority and cost calculation improvements
- Fixed terrain generation angle calculations, which would previously prevent nearest region being generated first
- We now generate caves on lower terrain LODs to decrease visual differences in lower detail terrain
- Introduced more varied and vibrant colouring to terrain for each biome
- Decreased frequency of brown terrain colour selections
- Changed texture scales to improve transition between terrain LODs
- Improved terrain colour combinations to add variety and better match terrain contouring
- Improved terrain texture blending method to better retain vibrant colours
- Improved settings for hue, saturation and value noise variation on terrain
- Fixed a number of issues causing holes to be seen in the planet terrain
- Fixed occasional crash when mining terrain

### Visuals

- Fixed colour of muzzle flashes on player weapons
- Added muzzle flashes to ship weapons
- Added cockpit lighting for damage and weapon firing
- Added debris to freighter explosion effect
- Improved freighter cargo explosions
- Improved [[Photon Cannon]] hit and space explosion effects
- Improved turret explosion effect
- Improved grass colour selection
- Improved grass colouring method to match underlying terrain colour
- Improved grass placement to match gradient of terrain, and rocky terrain slope patches
- Improved lighting on grass
- Improved alpha cutoffs and blending for grass in the distance
- Improved colouring method for on-planet buildings
- Fixed "pop" in lighting when flying between planets
- Fixed incorrect lighting seen in shadow areas
- Improved lighting method when rendering tree leaves
- Fixed procedural texturing on objects with multiple overlapping textures
- Fixed size of certain texture atlas normal maps
- Fixed texture scaling on asteroids
- [[Zinc]] plant is now more obvious when it has been gathered
- Fixed occasional rendering errors due to precision on cockpit during warp
- Fixed pulse lines not appearing when [[Pulse Engine|pulse driving]] out from planet atmosphere
- Fixed shadowing artefacts on imposters

### Space

- Improved [[asteroid|asteroids]] to allow much denser fields
- Improved explosion effects
- Fixed scale of [[moon|moons]] on the space map
- Added freighter groups to the space map
- Changed distribution of resources in asteroids
- AI ships will now clear asteroids in their path
- Planets are now scannable from space to see their resources

### Space Combat

- Fixed bounty targets warping out too soon
- Improved [[HUD]] indicators in space combat
- Added damaged ship effect on AI starships
- Added formation flying
- Improved locking on passive starships
- Improved AI combat flight patterns
- Added new ship weapon technology
- Holding brake whilst turning now activates drift for fast turns
- Improved AI ship freighter attacking
- Improved freighter targeting code when under attack by enemy ships

### Freighters

- Fixed pulse drive to prevent travel through [[freighter|freighters]]
- Improved docking code
- Added hangar to the lead freighter
- Added docking in freighters
- Added icon to accessible freighter hangars
- Added colouring to cargo drops to identify what is in them
- You can now only pick up cargo drops that will fit in your inventory
- Added auxiliary freight ships to freighter groups
- Added alert lights and alarm audio for when freighters are in combat
- Improved turret lights and explosions
- Improved muzzle flashes on freighter turrets
- Added indicator of cargo contents
- Freighter Commanders now give rewards for rescuing them from pirate attack
- Fixed collision on freighter cargo containers

### Audio

- Updated the lush ambience to make the wind sounds less noisy
- Ambient background fauna now checks for the presence of creatures
- Added rain on foliage
- Added rain on ship
- Added freighter specific footsteps
- When on a dead planet, no music will play
- Round table prop now plays an appropriate sound
- Added more music to the loading sequence and game start
- Added audio to new base building props
- Created sounds for new base building props
- Added audio to freighter doors and internal freighter ambiences
- Added freighter explosions
- Added freighter alarm
- Added ambient radio comms when approaching a freighter
- Fixed missing sounds when in a space station due to the mix settings
- Multi-tool upgrades now affect audio
- Lots of minor mix changes
- Changed some compression settings for PS4 audio to make the sub-channel audio play more reliably

## Observations

There are considerable changes to **Terrain** mentioned in the Foundation Update such as *Terrains now generate more open spaces* and *Improved terrain generation algorithms*. This means that a save game from a 1.0x version will start you on a nearby space station, not on the planet surface.

|   |   |
| --- | --- |
| [[Release]] | [[Update 1.10\|Foundation]] |
|   |   |
| Planet biomes have changed, in the example above, a Barren moon was changed into a Toxic moon. |   |
