// Sync on its own screen (#sync), reached from Settings and where a pairing link lands. Design 21 restyles its body.
import { goBack } from '../shell/section-store.ts';
import { Sync } from './Sync.tsx';

const TOP_BUTTON =
  'w-11 h-11 rounded-control bg-slate-ground border border-control-edge grid place-items-center text-ink hover:border-control-edge-hover';

export function SyncScreen() {
  return (
    <div className="flex flex-col gap-4 pt-[env(safe-area-inset-top)]">
      <header className="flex flex-col gap-1.5">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => {
              goBack('more');
            }}
            aria-label="Back to Settings"
            className={TOP_BUTTON}
          >
            <i className="ph-bold ph-caret-left text-lg" aria-hidden="true" />
          </button>
        </div>
        <h1 className="font-display text-screen-title text-ink-bright mt-4 lg:mt-0">Sync</h1>
        <p className="text-sub text-ink-muted">Your log on your own devices, encrypted before it leaves this one.</p>
      </header>
      <Sync />
    </div>
  );
}
