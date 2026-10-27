// When ATLAS's free sync server is full for the day (app/relay-status.ts): say so plainly, say the log is safe and
// when syncing resumes, and invite a donation to upgrade the server. Once per UTC day; dismissible.
import { useReducer } from 'react';
import { untilText, useRelayStatus } from '../../app/relay-status.ts';
import { KOFI_URL } from '../../app/support.ts';

const DISMISSED_KEY = 'atlas_capacity_notice'; // the UTC day it was dismissed: this device only
const utcDay = () => new Date().toISOString().slice(0, 10);
function dismissedToday(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === utcDay();
  } catch {
    return false;
  }
}

export function CapacityBanner() {
  const relay = useRelayStatus();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  // Read on every render, so a dismissal yesterday doesn't hide today's notice in an app left open overnight.
  if (relay.capacity !== 'full' || dismissedToday()) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, utcDay());
    } catch {}
    rerender();
  };
  return (
    <div
      id="capacityBanner"
      role="status"
      className="flex mb-5 rounded-xl border border-cyan-500/40 bg-cyan-500/[0.07] px-4 py-3 text-sm text-slate-200 items-start gap-3"
    >
      <i className="ph-fill ph-cloud-slash text-xl text-cyan-300 shrink-0" aria-hidden="true" />
      <p className="flex-1 min-w-0">
        ATLAS’s free sync server is full for today. Your log is safe on this device and syncs again after{' '}
        {untilText(relay.until)}. ATLAS runs on donations: a coffee helps upgrade the server.
      </p>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener"
          className="h-9 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5"
        >
          <i className="ph-bold ph-coffee" aria-hidden="true" /> Support on Ko-fi
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-9 h-9 rounded-lg text-slate-300 hover:bg-slate-800 flex items-center justify-center"
        >
          <i className="ph-bold ph-x" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
