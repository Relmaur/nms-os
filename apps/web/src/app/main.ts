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
import { startTimerRunner } from '../ui/session/timer-runner.ts';
import { startSync, takePairingLink } from './sync.ts';
import { startPush } from './push.ts';

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
startTimerRunner(); // a timer that finished while the app was closed is announced now
mountScreens();
takePairingLink(); // before the sections read the address: a #pair= link opens More and asks first
window.addEventListener('hashchange', takePairingLink); // registered before the sections' own listener
startSync(); // after the state loads, so the first sync merges with the saved log
startPush(); // resends this device's timer schedule if its alerts are on
startSections(); // after the state loads, so #new-system can open the editor
