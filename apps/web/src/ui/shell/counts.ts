// The page's frame (header, sidebar, tab bar) mounts before the state loads, so it never blinks in; its counts read
// 0 until the saved state is in, rather than counting the built-in defaults.
import { useSyncExternalStore } from 'react';
import { rankOutlaw } from '@atlas/core/systems-model';
import { getVersion, isLoaded, subscribe } from '../../app/store.ts';
import { useAppState } from '../useAppState.ts';
import { useNow } from '../useNow.ts';

export function useLoaded(): boolean {
  useSyncExternalStore(subscribe, getVersion);
  return isLoaded();
}

// Ready outlaw stations: the sidebar, the tab bar and the installed app's icon.
export function useOutlawReady(): { ready: number; total: number } {
  const state = useAppState();
  const now = useNow();
  if (!isLoaded()) return { ready: 0, total: 0 };
  const rows = rankOutlaw(state.systems, state.outlaw.restockHours, now);
  return { ready: rows.filter(row => row.status.ready).length, total: rows.length };
}
