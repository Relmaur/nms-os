// Store actions shared by React screens: mutate the live state, save, and confirm to the person.
import type { OutlawSettings } from '@atlas/core/state';
import { newId, normalizeSystem, tagSlug, type System } from '@atlas/core/systems-model';
import { clampOutlawSetting } from '@atlas/core/outlaw';
import { MAX_SESSIONS, type PastSession } from '@atlas/core/session';
import type { Timer, TimerKind } from '@atlas/core/timers';
import type { ParsedOutlawSystem } from '@atlas/core/systems-list';
import { appState, saveAppState } from '../app/store.ts';
import { showToast, haptic } from '../app/ui.ts';

const find = (id: string) => appState.systems.find(candidate => candidate.id === id);

export function logVisit(id: string, { note = '', packetRun = false } = {}): void {
  const system = find(id);
  if (!system) return;
  system.visits.push({
    at: new Date().toISOString(),
    ...(note ? { note } : {}),
    ...(packetRun ? { packets: appState.outlaw.packetsPerVisit } : {})
  });
  haptic();
  saveAppState();
  showToast(`Logged a visit to ${system.name}.`);
}

// Adds or replaces a system from the editor; a new one can log the arrival in the same step.
export function saveSystem(system: System, { arrived = false } = {}): void {
  const index = appState.systems.findIndex(item => item.id === system.id);
  if (index === -1) {
    if (arrived) system.visits.push({ at: new Date().toISOString() });
    appState.systems.push(system);
  } else {
    appState.systems[index] = system;
  }
  saveAppState();
  showToast(index === -1 ? `Added ${system.name}.` : `Saved ${system.name}.`);
}

export function deleteSystem(id: string): void {
  const system = find(id);
  appState.systems = appState.systems.filter(item => item.id !== id);
  saveAppState();
  showToast(`Deleted ${system?.name ?? 'system'}.`);
}

export function toggleFavorite(id: string): void {
  const system = find(id);
  if (!system) return;
  system.favorite = !system.favorite;
  saveAppState();
}

// Tapping the current rating again clears it.
export function setRating(id: string, rating: number): void {
  const system = find(id);
  if (!system) return;
  system.rating = system.rating === rating ? 0 : rating;
  saveAppState();
}

// Saves notes typed in the panel. Returns whether they reached storage, for the "Saved" / "Not saved" label.
export function saveNotes(id: string, notes: string): boolean {
  const system = find(id);
  if (!system || system.notes === notes) return true;
  system.notes = notes;
  return saveAppState();
}

export interface PlanetFields {
  name: string;
  biome: string;
  tags: string;
  notes: string;
}
export function savePlanet(systemId: string, planetId: string | null, fields: PlanetFields): void {
  const system = find(systemId);
  const name = fields.name.trim();
  if (!system || !name) return;
  const values = {
    name,
    biome: fields.biome.trim(),
    tags: [...new Set(fields.tags.split(',').map(tagSlug).filter(Boolean))],
    notes: fields.notes.trim()
  };
  const planet = system.planets.find(item => item.id === planetId);
  if (planet) Object.assign(planet, values);
  else system.planets.push({ id: newId('pl'), ...values });
  saveAppState();
}

export function deletePlanet(systemId: string, planetId: string): void {
  const system = find(systemId);
  if (!system) return;
  system.planets = system.planets.filter(planet => planet.id !== planetId);
  saveAppState();
}

export function deleteVisit(systemId: string, index: number): void {
  find(systemId)?.visits.splice(index, 1);
  saveAppState();
}

export function logPacketRun(id: string): void {
  const system = find(id);
  if (!system) return;
  system.visits.push({ at: new Date().toISOString(), packets: appState.outlaw.packetsPerVisit });
  haptic();
  saveAppState();
  showToast(`Logged ${system.name}. Ready again in ${appState.outlaw.restockHours}h.`);
}

// One timestamp for the whole run, so the stations restock together.
export function logOutlawRun(systems: System[]): void {
  const at = new Date().toISOString();
  systems.forEach(system => system.visits.push({ at, packets: appState.outlaw.packetsPerVisit }));
  haptic([12, 60, 12]);
  saveAppState();
  showToast(`Logged a run of ${systems.length} stations.`);
}

export function undoPacketRun(id: string): void {
  const system = find(id);
  if (!system) return;
  const index = system.visits.findLastIndex(visit => visit.packets);
  if (index !== -1) system.visits.splice(index, 1);
  saveAppState();
  showToast(`Removed the last run at ${system.name}.`);
}

// Returns the value kept, after rounding and bounds, so the input can show it.
export function setOutlawSetting(key: keyof OutlawSettings, value: string): number {
  const next = clampOutlawSetting(key, value);
  if (appState.outlaw[key] !== next) {
    appState.outlaw[key] = next;
    saveAppState();
  }
  return next;
}

export function addOutlawSystems(parsed: ParsedOutlawSystem[]): void {
  parsed.forEach(item => appState.systems.push(normalizeSystem({ ...item, id: newId('sys') })));
  saveAppState();
  showToast(`Added ${parsed.length} outlaw system${parsed.length === 1 ? '' : 's'}.`);
}

// A guide checklist step: ticked or not, saved with the rest of the log.
export function toggleChecklist(id: string): void {
  appState.checklists[id] = !appState.checklists[id];
  saveAppState();
}

// A play session: started when you sit down to play; ending it files it with the past ones and returns it.
export function startSession(): void {
  appState.session = { startedAt: new Date().toISOString(), timersDone: 0 };
  haptic();
  saveAppState();
}

export function endSession(): PastSession | null {
  const { session } = appState;
  if (!session) return null;
  const ended = { ...session, endedAt: new Date().toISOString() };
  appState.sessions = [...appState.sessions, ended].slice(-MAX_SESSIONS);
  appState.session = null;
  saveAppState();
  return ended;
}

export function addTimer(kind: TimerKind, label: string, durationMs: number): void {
  const now = Date.now();
  appState.timers.push({
    id: newId('timer'),
    kind,
    label,
    startedAt: new Date(now).toISOString(),
    endsAt: new Date(now + durationMs).toISOString(),
    alerted: false
  });
  haptic();
  saveAppState();
  showToast(`Timer set: ${label}.`);
}

export function dismissTimer(id: string): void {
  appState.timers = appState.timers.filter(timer => timer.id !== id);
  saveAppState();
}

// Marks finished timers as announced (and counts them toward the session in progress). Returns those it marked, so
// a timer finishing while two tabs are open is announced by one of them.
export function markAlerted(ids: string[]): Timer[] {
  const marked = appState.timers.filter(timer => ids.includes(timer.id) && !timer.alerted);
  if (!marked.length) return [];
  for (const timer of marked) timer.alerted = true;
  if (appState.session) appState.session.timersDone += marked.length;
  saveAppState();
  return marked;
}
