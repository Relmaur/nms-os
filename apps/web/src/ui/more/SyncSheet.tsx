// Sync as a sheet over Settings (design 21): a bottom sheet on phones (the grab bar closes it), a side panel from md up.
// Opened from Settings' Sync row, and by the #sync address, where a pairing link lands.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { SheetGrab, useSheetDrag, useSheetOpen } from '../parts/Sheet.tsx';
import { Sync } from './Sync.tsx';
import { useSection } from '../shell/section-store.ts';

const ALWAYS = '(min-width: 0px)';
let open = false;
const listeners = new Set<() => void>();
function set(next: boolean): void {
  open = next;
  listeners.forEach(listener => {
    listener();
  });
}
export const openSyncSheet = (): void => {
  set(true);
};
const closeSyncSheet = (): void => {
  set(false);
};

export function SyncSheet() {
  const shown = useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open
  );
  const section = useSection();
  // Leaving Settings (a tab, Back) closes it, or the page behind would stay locked.
  useEffect(() => {
    if (section !== 'more') closeSyncSheet();
  }, [section]);
  const sheet = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLButtonElement>(null);
  useSheetDrag(sheet, closeSyncSheet);
  useSheetOpen(shown, closeSyncSheet, { layout: ALWAYS, focus: top });
  return (
    <>
      <div
        onClick={closeSyncSheet}
        className={`fixed inset-0 z-[55] bg-scrim backdrop-blur-[2px] transition-opacity duration-200 ${shown ? '' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        ref={sheet}
        id="syncSheet"
        role="dialog"
        aria-modal="true"
        aria-label="Sync"
        aria-hidden={!shown}
        inert={!shown}
        className={`fixed z-[56] flex flex-col bg-slate-deep border-control-edge transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] inset-x-0 bottom-0 top-[max(84px,env(safe-area-inset-top))] rounded-t-sheet border-t ${shown ? '' : 'translate-y-full'} md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[min(28rem,92vw)] md:rounded-none md:border-t-0 md:border-l md:translate-y-0 ${shown ? '' : 'md:translate-x-full'}`}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] md:pb-6">
          <div
            data-sheet-grab
            className="sticky top-0 z-10 -mx-5 px-5 pt-3 md:pt-4 pb-1 bg-slate-deep flex justify-end"
          >
            <div className="flex-1 md:hidden">
              <SheetGrab onClose={closeSyncSheet} label="Close sync" />
            </div>
            <button
              ref={top}
              type="button"
              onClick={closeSyncSheet}
              aria-label="Close sync"
              className="hidden md:grid w-10 h-10 place-items-center rounded-control text-ink-soft hover:text-ink-bright"
            >
              <i className="ph-bold ph-x text-lg" aria-hidden="true" />
            </button>
          </div>
          {shown && <Sync />}
        </div>
      </div>
    </>
  );
}
