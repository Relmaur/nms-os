// More: the tools and reading kept out of the tab bar, this device (keep-awake, install, storage protection) and
// your data (Export and Import, the only way it leaves the device: ADR-0002).
import type { ReactNode } from 'react';
import { guideProgress } from '@atlas/core/guides';
import { exportState, importState } from '../../app/backup.ts';
import { useAppState } from '../useAppState.ts';
import { promptInstall, toggleKeepAwake, useDevice, type Device } from './device-store.ts';
import { useWikiCount } from '../shell/wiki-index.ts';

export function More() {
  const { checklists } = useAppState();
  const device = useDevice();
  const wikiCount = useWikiCount();
  return (
    <>
      <h1 className="font-display text-2xl font-bold text-white">More</h1>

      <Group title="Tools & reading">
        <li>
          <Row href="#calculators" icon="ph-calculator text-amber-300" title="Calculators">
            Recipe planner, base values, extractors, Harmonic Camp
          </Row>
        </li>
        <li>
          <Row href="#guides" icon="ph-book-open-text text-sky-300" title="Guides">
            Six books · {guideProgress(checklists).pct}% of checklists done
          </Row>
        </li>
        <li>
          <Row href="wiki/" icon="ph-books text-emerald-300" title="Wiki Codex">
            {wikiCount === null ? 'Game-data pages' : `${wikiCount.toLocaleString()} game-data pages`}, matched to the
            wiki
          </Row>
        </li>
      </Group>

      <Group title="This device">
        {device.wakeSupported && (
          <li className="list-row">
            <Tile icon="ph-sun-dim text-amber-300" />
            <Text title="Keep screen on" id="wakeLabel">
              While the app is open, so it’s ready next to your screen
            </Text>
            <button
              type="button"
              role="switch"
              aria-checked={device.awake}
              aria-labelledby="wakeLabel"
              onClick={toggleKeepAwake}
              className="switch"
            />
          </li>
        )}
        <li id="installRow" className="list-row">
          <Tile icon="ph-device-mobile text-cyan-300" />
          <Text title="App">{installText(device)}</Text>
          {device.installable && (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="h-9 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold"
            >
              Install
            </button>
          )}
        </li>
        <li className="list-row">
          <Tile icon="ph-hard-drives text-emerald-300" />
          <Text title="Storage">
            {device.persisted === null
              ? 'Checking…'
              : device.persisted
                ? 'Protected: the browser won’t clear your log to free up space.'
                : 'The browser may clear site data when space runs low. Install the app, and export a backup now and then.'}
          </Text>
        </li>
      </Group>

      <div className="space-y-2">
        <h2 className="list-heading">Your data</h2>
        <ul className="list-group">
          <li>
            <button type="button" onClick={exportState} className="list-row">
              <Tile icon="ph-download-simple text-emerald-300" />
              <Text title="Export nms_state.json">Back up, or move your log to another device</Text>
            </button>
          </li>
          <li>
            <label className="list-row cursor-pointer focus-within:ring-2 focus-within:ring-cyan-400">
              <Tile icon="ph-upload-simple text-amber-300" />
              <Text title="Import nms_state.json">Replaces this device’s data with the file’s</Text>
              <input
                type="file"
                accept=".json,application/json"
                onChange={event => {
                  void importState(event.target.files?.[0]);
                  event.target.value = ''; // allow re-importing the same file
                }}
                className="sr-only"
              />
            </label>
          </li>
        </ul>
        <p className="px-1 text-xs text-slate-400">Everything you log stays on this device until you export it.</p>
      </div>
    </>
  );
}

function installText(device: Device): string {
  if (device.standalone) return 'Installed: full screen, works offline.';
  if (device.installable) return 'Install it for a full-screen app that works offline.';
  if (device.ios) return 'To install: tap Share, then “Add to Home Screen”.';
  return 'To install: use “Install app” or “Add to Home Screen” in the browser menu.';
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="list-heading">{title}</h2>
      <ul className="list-group">{children}</ul>
    </div>
  );
}

function Tile({ icon }: { icon: string }) {
  return (
    <span className="nav-tile" aria-hidden="true">
      <i className={`ph-bold ${icon}`} />
    </span>
  );
}

function Text({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <span className="flex-1 min-w-0">
      <span id={id} className="block text-sm text-white">
        {title}
      </span>
      <span className="block text-xs text-slate-400">{children}</span>
    </span>
  );
}

function Row({ href, icon, title, children }: { href: string; icon: string; title: string; children: ReactNode }) {
  return (
    <a href={href} className="list-row">
      <Tile icon={icon} />
      <Text title={title}>{children}</Text>
      <i className="ph-bold ph-caret-right text-slate-500" aria-hidden="true" />
    </a>
  );
}
