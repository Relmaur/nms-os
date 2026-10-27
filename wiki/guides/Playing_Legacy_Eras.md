---
title: "Playing Legacy Eras"
category: "guides"
pageId: 456178
summary: "Playing Legacy Eras is a user guide on how to play legacy versions of No Man's Sky using the Steam platform."
source: "https://nomanssky.fandom.com/wiki/Playing_Legacy_Eras"
license: "CC BY-SA 3.0 (No Man's Sky Wiki contributors)"
updated: "2026-10-27"
---

# Playing Legacy Eras

**Playing Legacy Eras** is a user guide.

## Summary

**Playing Legacy Eras** is a user guide on how to play legacy versions of No Man's Sky using the Steam platform.

It includes many keyboard shortcuts typed out, as well as many screenshots. The actual process of downloading past updates is fairly straightforward, but this guide will be a work in progress for the foreseeable future.

NOTE: Pictures will be referenced by a "(Pic X)" at the beginning of the line that refers to them. The picture itself will be on the right side of the page.

## Purpose

The goal is to introduce new players to a much simpler, yet relaxing, and inquisitive-filled time in NMS history while giving veteran players a chance to relive the experiences from those "first discoveries" all over again. It will also allow a re-examination of what NMS was at launch, to celebrate what was a true feat in game-making, and to experience it removed from controversies to form fresh opinions.

## Preparation

Pic 1 - Folder Structure

Having the following items at the ready will make the process a bit faster.

- Steam
- Steam copy of No Man’s Sky
- (NVIDIA users only) Driver v466.77 (for Foundation & Path Finder) and back up copy of current drivers for easy access
- SmartSaveFolder for keeping track of saves per update (more on that later)
- SteamDB open in a web browser
- **(Pic 1)** A folder structure displayed, with version numbers included, for organized storage of downloaded updates

## Create Back-Up For Current Saves

For this step you will need to make hidden items viewable. To do so, click on the "View" tab at the top left of Windows Explorer, then tick the box for "Hidden Items")

- In Windows Explorer, navigate to: C:\Users\*YourUserName*\AppData\Roaming\HelloGames\NMS
- **CTRL+A** to select everything in this folder then **CTRL+C** to copy these files.
- Paste them in a folder for back-up storage if you already keep one handy, or create one if need be. (Personal note: You should have one. I highly encourage everyone to create new back-ups every month, at the latest. You don’t have to keep the prior back-ups. This goes for any game you put considerable time into.)

## The Download Process

Pic 2 - Browse local files

- Open Steam
- Navigate to No Man's Sky in your library
- From the game page in your library, click the cog on the right side below the game's banner.
- **(Pic 2)** Hover over "Manage", then click "Browse local files"
- **CTRL+Click** everything in this folder, then **CTRL+X** to cut (or "pick up", so to say) the files
- **CTRL+V** to paste these files in the new "CurrentBuild" folder you created for update storage so a clean install is not needed to play current day. This group of folders are for storing back-ups for any updates you download from Steam (Keeping in mind if you have the storage available. Tip: I keep mine in my D: drive because it’s much larger than my C:).
- You have now removed the current build from the No Man’s Sky game folder and stored it away for later usage.
- **(Pic 3)** If you have Family View active for Steam, disable this now by clicking the green icon at the top, entering your PIN, then clicking OK. The icon should now be red.

Pic 4 - Command Prompt

**Steam must remain open from this point until we are done.**

- Press **Windows Key+R**. This will open the Command Prompt (or "Run").
- **(Pic 4)** In the Command Prompt type, "steam://open/console" without quotations. This will add an additional tab at the top of Steam that says **Console**. This is where we will do most of our work.

Pic 5 - After "download_depot "

- **(Pic 5)** At the very bottom there is a text bar. Click on this and type "download_depot " without quotations. (The space at the end of depot is intentional. Make sure to leave a space.)
- Leaving Steam for now, bring up your browser with SteamDB loaded. At the top, use the search bar to search for No Man's Sky.
- On the page for No Man's Sky you will see "App ID" followed by the number "275850". Double-click this number to highlight it and press **CTRL+C** to copy this number.
- Return to Steam and paste this (**CTRL+V**) following the word *depot*, making sure there is a space between the two.

### Depots tab

Pic 6 - Depots tab

- **(Pic 6)** Returning to SteamDB, on the same page a bit further down there is a sidebar on the left side of the screen. Click on the "Depots" tab
- On the Depots page in the top box of information, the bottom row shows the number "275851" followed by "No Man's Sky Content". This is the Depot ID. Click the number.
- On this page, the very top row of text shows the Depot ID again. Double-click on the number and **CTRL+C** to copy it. Return to Steam and in the text bar, **CTRL+V** to paste it in. Remember to add a space afterward!

### Manifests tab

- Back to SteamDB on the left sidebar click "Manifests"
- This next page will be a bit overwhelming. It's okay. This is the internal Steam identifying info for every single update to NMS. You don't need to know which updates are what for now.

### Installing Classic NMS

Pic 7 - Paste the Manifest ID

- Scroll to the bottom of the page.
- Look for the update dated **10-26-16**. Unfortunately there is no identifier to what an update is besides for the date it was released.
- **(Pic 7)** Copy this number: **7324577403707723494** and paste it into Steam after the last number, making sure there is a space between, but NOT at the end of it. This is the Manifest ID for the Legacy NMS updates. Press enter.

Congrats! Very soon you will be playing the original No Man's Sky. Let the download complete, keeping the Console tab active. You can minimize Steam and go about doing whatever in the meantime.

## Which Release Version to Download?

You may have been expecting to grab the ManifestID for the first update on the list, but this is not the case. When you consider every single update has had patches at some point, it makes sense to grab the info for the last patch before the next big named update. **Example:** 1.03 is the initial PC release of NMS, but we downloaded 1.09 since it is the final patch for that version. The next update after this is Foundation. For Foundation we would download update 1.13, since it is the last update before Path Finder. Early No Man's Sky was buggier than it is now, so you want to make sure you are getting every bug fix available for each version of NMS you are downloading. It also helps if using mods.

The following is an overview of what is considered “Legacy NMS” and which version number plus ManifestID you would need:

| Release | Date | ManifestID | Next Release | Date |
| --- | --- | --- | --- | --- |
| Release 1.09.1 | 10-26-2016 | 7324577403707723494 | Foundation 1.1 | 11-27-2016 |
| Foundation 1.13 | 12-12-16 | 2123008115602074603 | Pathfinder 1.2 | 03-08-17 |
| Pathfinder 1.24 | 3-27-17 | 3749359456608052294 | Atlas Rises 1.3 | 8-11-17 |
| Atlas Rises 1.39 | 10-3-17 | 8262658978126728861 | NEXT 1.5 | 4-28-18 |

## Finishing the download

Pic 8 - Download complete!

**(Pic 8)** *Download complete!* Once you see this message in the console it means your download is finished.

- Navigate to C:\Program Files (x86)\Steam\steamapps\content\app_275850\depot_275851
- In this folder you will see the binaries and GAMEDATA folders. **CTRL+A** to select both folders and **CTRL+X** to cut them. Click on "steamapps" in the Windows Explorer navigation bar, then go to steamapps/common/No Man's Sky. **CTRL+V** these into the main No Man's Sky folder.
- You are almost done! Go grab the highly needed SmartSaveFolder over on **NoMansSkyRetro** to be able to keep your old current save files separated from your new ones. It allows NMS to save its game files directly into the binaries folder.
- After extracting it somewhere convenient, start SmartSaveFolder. Allow it permission if asked.
- Now go back to your steam library and click play on No Man's Sky. You’re done!

You shouldn’t need to run SmartSave every time you play, just once for every time you change updates.

**Note:** If you have a current-day NVIDIA GPU and want to play either Foundation or Path Finder you need to download the drivers. You may also want to grab a copy of current drivers but that isn't a must at this point.

## Conclusion

This concludes the current guide. There will be additional enhancements to clean up the format, making it clearer to understand, and other improvements. If you have feedback, include it on the talk page.

The original guide is available for review and future updates.
