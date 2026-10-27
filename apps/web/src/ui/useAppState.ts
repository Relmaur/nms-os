// The live app state for React screens. The store mutates one object in place, so components subscribe to its
// version number and re-render whenever it changes (after every load, save and adopted tab copy).
import { useSyncExternalStore } from 'react';
import type { AppState } from '@atlas/core/state';
import { appState, getVersion, subscribe } from '../app/store.ts';

export function useAppState(): AppState {
  useSyncExternalStore(subscribe, getVersion);
  return appState;
}
