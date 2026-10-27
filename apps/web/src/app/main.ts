// The main page's entry: the frame mounts at once, the state loads, then the screens mount and the section in the
// address opens. Every part of the page is React (src/ui); this only wires them together.
import { WikiSearch } from './wiki-data.js';
import { loadAppState, onStorageStatus } from './store.ts';
import { registerServiceWorker } from './pwa.js';
import { mountFrame, mountScreens } from '../ui/mount.tsx';
import { loadGameData } from '../ui/calculators/game-data.ts';
import { startDevice } from '../ui/more/device-store.ts';
import { openSystemEditor } from '../ui/systems/panel-store.ts';
import { onSection, startSections } from '../ui/shell/section-store.ts';
import { reportStorage } from '../ui/shell/StorageBanner.tsx';
import { setWikiEntries } from '../ui/shell/wiki-index.ts';

registerServiceWorker();
startDevice();
onStorageStatus(reportStorage);
onSection('calculators', () => void loadGameData());
onSection('new-system', () => {
  openSystemEditor();
});
mountFrame();
void WikiSearch.load('wiki/').then(setWikiEntries);

await loadAppState();
mountScreens();
startSections(); // after the state loads, so #new-system can open the editor
