// More: the tools and reading kept out of the tab bar, this device (keep-awake, install, storage protection), sync
// between devices (opt-in and encrypted: ADR-0005), your data (Export and Import), and a way to support the app.
import { useState, type ReactNode } from 'react';
import { guideProgress } from '@atlas/core/guides';
import { formatDuration } from '@atlas/core/format';
import { sessionRecap } from '@atlas/core/session';
import { exportState, importState, undoImport, useImportUndo } from '../../app/backup.ts';
import { useAppState } from '../useAppState.ts';
import { promptInstall, toggleKeepAwake, useDevice, type Device } from './device-store.ts';
import { useWikiCount } from '../shell/wiki-index.ts';
import { useSyncStatus } from '../../app/sync.ts';
import { Sync } from './Sync.tsx';
import { KOFI_URL } from '../../app/support.ts';
import { usePushStatus } from '../../app/push.ts';
import { AlertsSwitch } from '../session/AlertsSwitch.tsx';

export function More() {
  const state = useAppState();
  const { checklists } = state;
  const device = useDevice();
  const wikiCount = useWikiCount();
  const sync = useSyncStatus();
  const push = usePushStatus();
  const canUndoImport = useImportUndo();
  const [confirmUndo, setConfirmUndo] = useState(false);
  return (
    <>
      <h1 className="font-display text-2xl font-bold text-white">More</h1>

      <Group title="Your gear & notes">
        <li>
          <Row href="#gear" icon="ph-rocket text-cyan-300" title="Ships & Multi-Tools">
            {state.gear.length
              ? `${String(state.gear.length)} saved, with supercharged slots and layouts`
              : 'Your ships and Multi-Tools, their slots and layouts'}
          </Row>
        </li>
        <li>
          <Row href="#notes" icon="ph-note-pencil text-sky-300" title="Notes">
            {state.notes.length
              ? `${String(state.notes.length)} note${state.notes.length === 1 ? '' : 's'} · pin them to Home or a book`
              : 'Your own findings, pinned to Home or a Guide book'}
          </Row>
        </li>
      </Group>

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
        {push.support !== 'no' && (
          <li className="list-row">
            <Tile icon="ph-bell-ringing text-cyan-300" />
            <div className="flex-1 min-w-0">
              <AlertsSwitch id="morePushSwitch" />
            </div>
          </li>
        )}
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

      {state.sessions.length > 0 && (
        <Group title="Play sessions">
          {state.sessions
            .slice(-5)
            .reverse()
            .map(session => {
              const recap = sessionRecap(state, session, Date.parse(session.endedAt));
              return (
                <li key={session.startedAt} className="list-row">
                  <Tile icon="ph-hourglass-medium text-emerald-300" />
                  <Text
                    title={new Date(session.startedAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  >
                    {formatDuration(recap.elapsed)} · {recap.visits} visit{recap.visits === 1 ? '' : 's'}
                    {recap.packetRuns
                      ? ` · ${String(recap.packetRuns)} packet run${recap.packetRuns === 1 ? '' : 's'}`
                      : ''}
                    {recap.timersDone ? ` · ${String(recap.timersDone)} timer${recap.timersDone === 1 ? '' : 's'}` : ''}
                  </Text>
                </li>
              );
            })}
        </Group>
      )}

      <Sync />

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
              <Text title="Import nms_state.json">Shows what the file holds, then replaces this device’s log</Text>
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
          {canUndoImport && (
            <li>
              <button
                type="button"
                onClick={() => {
                  if (confirmUndo) undoImport();
                  setConfirmUndo(!confirmUndo);
                }}
                className="list-row"
              >
                <Tile icon="ph-arrow-counter-clockwise text-cyan-300" />
                <Text title={confirmUndo ? 'Tap again to undo the import' : 'Undo import'}>
                  {confirmUndo
                    ? 'Anything logged since the import is lost, on every synced device.'
                    : 'Puts back the log this device had before the last import (for a day)'}
                </Text>
              </button>
            </li>
          )}
        </ul>
        <p className="px-1 text-xs text-slate-400">
          {sync.enabled
            ? 'Everything you log stays on this device, plus the encrypted copy sync keeps for your devices.'
            : 'Everything you log stays on this device until you export it or turn on sync.'}
        </p>
      </div>

      {KOFI_URL && (
        <Group title="Support">
          <li>
            <a href={KOFI_URL} target="_blank" rel="noopener" className="list-row">
              <Tile icon="ph-coffee text-amber-300" />
              <Text title="Support ATLAS on Ko-fi">Free, with nothing locked. A coffee helps keep sync running.</Text>
              <i className="ph-bold ph-arrow-square-out text-slate-500" aria-hidden="true" />
            </a>
          </li>
        </Group>
      )}
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
