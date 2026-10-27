// Export and Import of nms_state.json (ADR-0002), shared by More and the main page's header. Export is one of the
// ways the log leaves this device, with the opt-in encrypted sync (ADR-0005) and alert schedules (ADR-0006).
import { isPlainObject } from '@atlas/core/util';
import { buildState, migrateLegacyState } from '@atlas/core/state';
import { validateState, describeErrors } from '@atlas/core/schema';
import { useSyncExternalStore } from 'react';
import type { AppState } from '@atlas/core/state';
import { appState, setAppState, saveAppState, STORAGE_KEY } from './store.ts';
import { resetSyncBase, syncCode } from './sync.ts';
import { showToast } from './ui.ts';

export function exportState(): void {
  const blob = new Blob([JSON.stringify(appState, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'nms_state.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast('Exported nms_state.json: keep it somewhere safe.');
}

// Import is two steps: the file is read and checked, then shown (what it holds, what happens to this log and to sync)
// until the person confirms. Nothing is replaced unless the whole file is valid; the log it replaces is kept as a
// backup that Undo (More → Your data) puts back.
const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // a log is a few KB; a bigger file isn't one
const BEFORE_IMPORT_KEY = `${STORAGE_KEY}.before-import`;

export interface PendingImport {
  name: string;
  state: AppState;
  systems: number;
  gear: number;
  notes: number;
  syncOn: boolean;
}
let pending: PendingImport | null = null;
const listeners = new Set<() => void>();
function setPending(next: PendingImport | null): void {
  pending = next;
  listeners.forEach(listener => {
    listener();
  });
}
export function usePendingImport(): PendingImport | null {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => pending
  );
}

export async function importState(file: File | undefined): Promise<void> {
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) {
    showToast('That file is over 5 MB, so it isn’t an ATLAS log. Nothing was imported.');
    return;
  }
  let imported: unknown;
  try {
    imported = JSON.parse(await file.text());
  } catch {
    showToast('That file isn’t valid JSON, so nothing was imported.');
    return;
  }
  const candidate = isPlainObject(imported) ? migrateLegacyState(imported) : imported;
  const { ok, errors } = validateState(candidate);
  if (!ok) {
    showToast(`Not imported: ${describeErrors(errors.slice(0, 2))}.`);
    return;
  }
  const state = buildState(candidate);
  setPending({
    name: file.name,
    state,
    systems: state.systems.length,
    gear: state.gear.length,
    notes: state.notes.length,
    syncOn: syncCode() !== null
  });
}

export function confirmImport(): void {
  const next = pending;
  setPending(null);
  if (!next) return;
  try {
    localStorage.setItem(BEFORE_IMPORT_KEY, JSON.stringify({ at: Date.now(), doc: appState }));
  } catch {
    showToast('Not imported: there’s no room to keep your current log as a backup. Export it first.');
    return;
  }
  // With sync on, the next sync combines the file with the synced log (nothing on other devices is removed).
  if (next.syncOn) resetSyncBase();
  setAppState(next.state);
  saveAppState();
  undoAvailable = true;
  notifyUndo();
  showToast(`Imported ${next.name}. Undo it in More → Your data.`);
}

export function cancelImport(): void {
  setPending(null);
}

// Undo: the log from before the last import comes back (as a new edit, so sync carries it too). Only for a day: after
// that, the log has moved on, and going back would lose everything logged since (More also asks first).
const UNDO_MS = 24 * 3_600_000;
function readBeforeImport(): unknown {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(BEFORE_IMPORT_KEY) ?? 'null');
    if (isPlainObject(kept) && typeof kept.at === 'number' && Date.now() - kept.at < UNDO_MS) return kept.doc;
    localStorage.removeItem(BEFORE_IMPORT_KEY);
  } catch {}
  return null;
}
let undoAvailable = readBeforeImport() !== null;
const undoListeners = new Set<() => void>();
function notifyUndo(): void {
  undoListeners.forEach(listener => {
    listener();
  });
}
export function useImportUndo(): boolean {
  return useSyncExternalStore(
    listener => {
      undoListeners.add(listener);
      return () => undoListeners.delete(listener);
    },
    () => undoAvailable
  );
}
export function undoImport(): void {
  try {
    const before = readBeforeImport();
    if (!before || !validateState(before).ok) throw new Error('backup unreadable or expired');
    setAppState(buildState(before));
    saveAppState();
    localStorage.removeItem(BEFORE_IMPORT_KEY);
    undoAvailable = false;
    notifyUndo();
    showToast('Import undone: your log is back as it was.');
  } catch {
    undoAvailable = readBeforeImport() !== null;
    notifyUndo();
    showToast('Couldn’t undo the import (it can be undone for a day).');
  }
}
