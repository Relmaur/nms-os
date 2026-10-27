// The main page's header: the logo (back to Home), the search, and Export and Import (click, or drop a file).
import { useState } from 'react';
import { exportState, importState } from '../../app/backup.ts';
import { Search, openSearch } from './Search.tsx';
import { showSection } from './section-store.ts';

export function Header() {
  const [dropping, setDropping] = useState(false);
  return (
    <div className="max-w-[1600px] mx-auto h-14 lg:h-16 px-4 sm:px-6 flex items-center gap-3 sm:gap-4">
      <a
        href="#home"
        onClick={event => {
          event.preventDefault();
          showSection('home');
        }}
        className="flex items-center gap-3 shrink-0 min-w-0 rounded-lg"
      >
        <span className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-red-500/10 border border-red-500/40 flex items-center justify-center">
          <i className="ph-fill ph-planet text-lg lg:text-xl text-red-500" aria-hidden="true" />
        </span>
        <span className="font-display font-bold text-sm sm:text-base tracking-wider text-white whitespace-nowrap">
          ATLAS<span className="text-cyan-400">//</span>MASTER_OS
        </span>
      </a>

      <Search />

      <div className="ml-auto md:ml-0 flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search"
          className="md:hidden w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-900 transition"
        >
          <i className="ph-bold ph-magnifying-glass text-xl" aria-hidden="true" />
        </button>
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
