// Storage problems the person must see: shown until resolved or dismissed, with an Export when changes would
// otherwise be lost. store.ts reports them (reportStorage is registered with onStorageStatus by main.ts).
import { useSyncExternalStore } from 'react';
import type { StorageStatus } from '../../app/store.ts';
import { showToast } from '../../app/ui.ts';
import { exportState } from '../../app/backup.ts';

interface Banner {
  message: string;
  offerExport: boolean;
}
const NONE: Banner = { message: '', offerExport: false };

let banner = NONE;
const listeners = new Set<() => void>();
function set(next: Banner): void {
  banner = next;
  listeners.forEach(listener => {
    listener();
  });
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reportStorage(status: StorageStatus): void {
  if (status.saveFailed)
    set({
      message:
        'Not saved on this device: the browser refused to store your changes (storage may be full, or this is a private window). They’re kept until you close the app, so export a backup now.',
      offerExport: true
    });
  else if (status.saveFailed === false) set(NONE);
  if (status.unreadableNotKept)
    set({
      message:
        'Your saved data in this browser couldn’t be read, and there’s no room to keep a copy aside, so the app won’t write over it: changes you make now are not saved. Export them if you need them, then free up browser storage and reload.',
      offerExport: true
    });
  if (status.recoveredKey)
    set({
      message: `Your saved data in this browser couldn’t be read, so the app started from the default state. Nothing was deleted: the unreadable copy is kept in this browser under “${status.recoveredKey}”.`,
      offerExport: false
    });
  if (status.fromOtherTab) showToast('Updated with changes from another tab.');
}

export function StorageBanner() {
  const { message, offerExport } = useSyncExternalStore(subscribe, () => banner);
  if (!message) return null;
  return (
    <div
      id="storageBanner"
      role="alert"
      className="flex mb-5 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 items-start gap-3"
    >
      <i className="ph-fill ph-warning text-xl text-amber-300 shrink-0" aria-hidden="true" />
      <p id="storageBannerText" className="flex-1 min-w-0">
        {message}
      </p>
      <div className="flex shrink-0 gap-2">
        {offerExport && (
          <button
            type="button"
            id="storageBannerExport"
            onClick={exportState}
            className="h-9 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold"
          >
            Export backup
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            set(NONE);
          }}
          aria-label="Dismiss"
          className="w-9 h-9 rounded-lg text-amber-200 hover:bg-amber-500/20 flex items-center justify-center"
        >
          <i className="ph-bold ph-x" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
