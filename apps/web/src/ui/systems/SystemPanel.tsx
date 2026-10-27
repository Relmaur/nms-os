// The system panel: a side panel from md up, a bottom sheet below. Shows a system (SystemDetails) or the editor.
// It stays mounted so it can slide in and out; while closed it is inert and hidden from assistive tech.
import { useEffect, useRef } from 'react';
import { BIOMES, ECONOMIES } from '@atlas/core/systems-model';
import {
  closeSystemPanel,
  dismissSystemPanel,
  findSystem,
  openSystem,
  takeReturnFocus,
  usePanel
} from './panel-store.ts';
import { useSheetDrag } from '../parts/Sheet.tsx';
import { useAppState } from '../useAppState.ts';
import { SystemDetails } from './SystemDetails.tsx';
import { SystemEditor } from './SystemEditor.tsx';

export function SystemPanel() {
  useAppState();
  const panel = usePanel();
  const sheet = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const system = findSystem(panel.systemId);

  // Each open (and each switch between view and editor) starts at the top.
  useEffect(() => {
    if (panel.open && scroller.current) scroller.current.scrollTop = 0;
  }, [panel.open, panel.session]);

  // While open the page behind doesn't scroll; on close, focus goes back to what opened the panel.
  useEffect(() => {
    if (!panel.open) return;
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
      const opener = takeReturnFocus();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [panel.open]);

  // Esc leaves the editor for the system's view, or closes the panel.
  useEffect(() => {
    if (!panel.open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (panel.mode === 'edit' && panel.systemId) openSystem(panel.systemId);
      else closeSystemPanel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [panel.open, panel.mode, panel.systemId]);

  useSheetDrag(sheet, dismissSystemPanel);

  return (
    <>
      <div
        id="systemBackdrop"
        onClick={closeSystemPanel}
        className={`fixed inset-0 z-[55] bg-slate-950/60 backdrop-blur-[2px] transition-opacity duration-200 ${panel.open ? '' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        ref={sheet}
        id="systemPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="systemPanelTitle"
        aria-hidden={!panel.open}
        inert={!panel.open}
        className={`fixed z-[56] flex flex-col bg-slate-950 border-slate-700 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] inset-x-0 bottom-0 h-[92dvh] rounded-t-3xl border-t ${panel.open ? '' : 'translate-y-full'} md:inset-x-auto md:right-0 md:top-0 md:h-full md:w-[min(40rem,92vw)] md:rounded-none md:border-t-0 md:border-l md:translate-y-0 ${panel.open ? '' : 'md:translate-x-full'}`}
      >
        <div
          ref={scroller}
          id="systemPanelScroll"
          className="flex-1 overflow-y-auto overscroll-contain rounded-t-3xl md:rounded-none"
        >
          <div id="systemPanelBody" className="min-h-full flex flex-col">
            {panel.mode === 'edit' ? (
              <SystemEditor key={panel.session} existing={system} preset={panel.preset} />
            ) : system ? (
              <SystemDetails key={panel.session} system={system} open={panel.open} />
            ) : null}
          </div>
        </div>
      </div>
      <datalist id="economyOptions">
        {ECONOMIES.map(value => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="biomeOptions">
        {BIOMES.map(value => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </>
  );
}
