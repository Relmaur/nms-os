// Store actions shared by React screens: mutate the live state, save, and confirm to the person.
import { appState, saveAppState } from '../app/store.ts';
import { showToast, haptic } from '../app/ui.ts';

export function logVisit(id: string): void {
  const system = appState.systems.find(candidate => candidate.id === id);
  if (!system) return;
  system.visits.push({ at: new Date().toISOString() });
  haptic();
  saveAppState();
  showToast(`Logged a visit to ${system.name}.`);
}
