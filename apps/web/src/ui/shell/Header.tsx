// The main page's header: the logo (back to Home), the search (from md), Settings below lg, the session, and Export
// and Import (click, or drop a file).
import { useState } from 'react';
import { exportState, importState } from '../../app/backup.ts';
import { Search } from './Search.tsx';
import { showSection } from './section-store.ts';
import { openSessionSheet } from '../session/sheet-store.ts';
import { useAppState } from '../useAppState.ts';

export function Header() {
  const [dropping, setDropping] = useState(false);
  return (
    <div className="max-w-[1600px] mx-auto h-14 lg:h-16 px-4 sm:px-6 flex items-center gap-3 sm:gap-4">
      <a
        href="#home"
        onClick={event => {
          event.preventDefault();
          void showSection('home');
        }}
        className="flex items-center gap-3 shrink-0 min-w-0 rounded-lg"
      >
        <span className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-red-500/10 border border-red-500/40 flex items-center justify-center">
          <i className="ph-fill ph-planet text-lg lg:text-xl text-red-500" aria-hidden="true" />
        </span>
        <span className="font-display font-bold text-sm sm:text-base tracking-wider text-white whitespace-nowrap">
          ATLAS<span className="text-scanner-cyan-pale">:OS</span>
        </span>
      </a>

      <Search />

      <div className="ml-auto md:ml-0 flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Settings (More) has no tab: below lg it sits behind this gear. Search moved to the tab bar's key. */}
        <a
          href="#more"
          aria-label="Settings"
          title="Settings"
          className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-900 md:bg-slate-900 md:border md:border-slate-800 md:hover:bg-slate-800 transition"
        >
          <i className="ph-bold ph-gear-six text-xl md:text-base" aria-hidden="true" />
        </a>
        <SessionButton
          id="sessionButton"
          className="w-10 h-10 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 md:bg-slate-900 md:border md:border-slate-800 md:hover:bg-slate-800"
        />
        <button
          type="button"
          onClick={exportState}
          title="Export nms_state.json"
          aria-label="Export nms_state.json"
          className="hidden md:flex h-10 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-emerald-300 items-center gap-2 transition"
        >
          <i className="ph-bold ph-download-simple text-base" aria-hidden="true" />
          <span className="hidden xl:inline">Export</span>
        </button>
        <label
          id="importDropzone"
          title="Import nms_state.json (click or drop the file here)"
          onDragOver={event => {
            event.preventDefault();
            setDropping(true);
          }}
          onDragLeave={() => {
            setDropping(false);
          }}
          onDrop={event => {
            event.preventDefault();
            setDropping(false);
            void importState(event.dataTransfer.files[0]);
          }}
          className={`hidden md:flex cursor-pointer h-10 px-3 rounded-xl hover:bg-slate-800 border border-dashed text-xs font-medium text-amber-300 items-center gap-2 transition focus-within:ring-2 focus-within:ring-cyan-400 ${dropping ? 'border-amber-400 bg-amber-500/10' : 'bg-slate-900 border-slate-700'}`}
        >
          <i className="ph-bold ph-upload-simple text-base" aria-hidden="true" />
          <span className="hidden xl:inline">Import</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={event => {
              void importState(event.target.files?.[0]);
              event.target.value = ''; // allow re-importing the same file
            }}
            className="sr-only"
            aria-label="Import nms_state.json"
          />
        </label>
      </div>
    </div>
  );
}

// Opens the Session sheet (timers and the session), with a dot while something runs: cyan, or emerald once a timer is
// done. In the app header, and in Home's own header below lg until Search's quick actions can start a timer.
export function SessionButton({ id, className }: { id: string; className: string }) {
  const { session, timers } = useAppState();
  const active = session !== null || timers.length > 0;
  const done = timers.some(timer => timer.alerted); // announced and not yet dismissed
  return (
    <button
      type="button"
      id={id}
      onClick={openSessionSheet}
      aria-label={
        done ? 'Session and timers (a timer is done)' : active ? 'Session and timers (running)' : 'Session and timers'
      }
      title="Session and timers"
      className={`relative flex items-center justify-center transition ${className}`}
    >
      <i className="ph-bold ph-timer text-xl md:text-base" aria-hidden="true" />
      {active && (
        <span
          className={`absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-slate-950 ${done ? 'bg-emerald-400' : 'bg-cyan-400'}`}
          aria-hidden="true"
        />
      )}
    </button>
  );
}
