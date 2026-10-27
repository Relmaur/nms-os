// Systems log model: constants, normalisation, legacy migration and Outlaw Run status (pure, no DOM).
// State lives in nms_state.json → systems[] + outlaw{} (docs/state-schema.md).
import { isPlainObject } from './util.js';
import { formatDuration } from './format.js';

export const OUTLAW_TAG = 'outlaw';
export const HOUR_MS = 3600 * 1000;

export const STAR_CLASSES = {
    yellow: { label: 'Yellow', color: '#facc15' },
    red: { label: 'Red', color: '#f87171' },
    green: { label: 'Green', color: '#4ade80' },
    blue: { label: 'Blue', color: '#60a5fa' },
    purple: { label: 'Purple', color: '#c084fc' }
};
export const RACES = { gek: 'Gek', korvax: 'Korvax', vykeen: "Vy'keen", none: 'Uncharted', abandoned: 'Abandoned' };
export const CONFLICT_LEVELS = { low: 'Low', medium: 'Medium', high: 'High', pirate: 'Pirate (outlaw)' };
export const ECONOMIES = ['Trading', 'Mining', 'Manufacturing', 'Technology', 'Scientific', 'Power Generation', 'Advanced Materials'];
export const BIOMES = ['Lush', 'Paradise', 'Barren', 'Frozen', 'Scorched', 'Toxic', 'Irradiated', 'Exotic', 'Dead', 'Marsh', 'Volcanic', 'Waterworld', 'Gas Giant', 'Infested'];
export const SUGGESTED_TAGS = [OUTLAW_TAG, 'trade-hub', 'base', 'harmonic-camp', 's-class-ship', 'crash-site', 'portal', 'settlement', 'farming', 'mining', 'paradise', 'exotic', 'to-revisit', 'home'];
export const SORTS = { recent: 'Last visited', discovered: 'Newest added', name: 'Name', rating: 'Rating', region: 'Region' };
export const LOGBOOK_TYPE_TAGS = { 'S-Class Crash Site': 's-class-ship', 'Harmonic Camp': 'harmonic-camp', 'Outlaw Station': OUTLAW_TAG, 'Hotspot / Base': 'base', 'Custom Guide Note': 'note' };

export function newId(prefix) {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function tagSlug(value) {
    return String(value ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function normalizeGlyphs(value) {
    return String(value || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
}

export function clampInt(value, min, max) {
    return Math.min(max, Math.max(min, Math.round(Number(value)) || 0));
}

export function normalizeSystem(raw) {
    const system = {
        id: String(raw.id || newId('sys')),
        name: String(raw.name || 'Unnamed system').trim() || 'Unnamed system',
        galaxy: String(raw.galaxy || 'Euclid'),
        region: String(raw.region || ''),
        glyphs: normalizeGlyphs(raw.glyphs),
        star: raw.star in STAR_CLASSES ? raw.star : '',
        race: raw.race in RACES ? raw.race : '',
        economy: String(raw.economy || ''),
        wealth: clampInt(raw.wealth, 0, 3),
        conflict: raw.conflict in CONFLICT_LEVELS ? raw.conflict : '',
        tags: [...new Set((Array.isArray(raw.tags) ? raw.tags : []).map(tagSlug).filter(Boolean))],
        favorite: !!raw.favorite,
        rating: clampInt(raw.rating, 0, 5),
        notes: String(raw.notes || ''),
        planets: (Array.isArray(raw.planets) ? raw.planets : []).filter(isPlainObject).map(planet => ({
            id: String(planet.id || newId('pl')),
            name: String(planet.name || 'Unnamed planet'),
            biome: String(planet.biome || ''),
            tags: [...new Set((Array.isArray(planet.tags) ? planet.tags : []).map(tagSlug).filter(Boolean))],
            notes: String(planet.notes || '')
        })),
        visits: (Array.isArray(raw.visits) ? raw.visits : [])
            .filter(visit => isPlainObject(visit) && !Number.isNaN(Date.parse(visit.at)))
            .map(visit => ({ at: visit.at, ...(visit.note ? { note: String(visit.note) } : {}), ...(Number(visit.packets) > 0 ? { packets: Number(visit.packets) } : {}) }))
            .sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
        createdAt: raw.createdAt && !Number.isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : (raw.visits?.[0]?.at || new Date().toISOString())
    };
    return system;
}

// Folds the pre-Systems `logbook[]` and `outlaw.stations[]` into `systems[]`. Ids are kept, so running it
// on an already-migrated state (or merging an old export into a new one) never duplicates entries.
export function migrateToSystems(state) {
    const systems = Array.isArray(state.systems) ? state.systems.filter(isPlainObject) : [];
    const ids = new Set(systems.map(system => String(system.id)));
    const add = system => { if (!ids.has(system.id)) { ids.add(system.id); systems.push(system); } };

    (Array.isArray(state.logbook) ? state.logbook : []).filter(isPlainObject).forEach(entry => {
        const solution = Array.isArray(entry.glyphSolution) && entry.glyphSolution.length ? `Harmonic Camp solution: ${entry.glyphSolution.join(', ')}` : '';
        add({
            id: String(entry.id),
            name: entry.system || entry.title,
            tags: [LOGBOOK_TYPE_TAGS[entry.type] || tagSlug(entry.type || 'note')],
            notes: [entry.notes || entry.details, solution].filter(Boolean).join('\n')
        });
    });
    (Array.isArray(state.outlaw?.stations) ? state.outlaw.stations : []).filter(isPlainObject).forEach(station => {
        add({
            id: String(station.id),
            name: station.system || station.name,
            galaxy: station.galaxy,
            glyphs: station.glyphs,
            conflict: 'pirate',
            tags: [OUTLAW_TAG],
            notes: [station.system && station.name !== station.system ? `Station: ${station.name}` : '', station.notes].filter(Boolean).join('\n'),
            visits: station.visits
        });
    });

    delete state.logbook;
    if (isPlainObject(state.outlaw)) delete state.outlaw.stations;
    state.systems = systems.map(normalizeSystem);
}

export function lastVisit(system) {
    return system.visits[system.visits.length - 1];
}

export function systemHaystack(system) {
    return [
        system.name, system.region, system.galaxy, system.economy, system.notes, system.glyphs, RACES[system.race], STAR_CLASSES[system.star]?.label,
        ...system.tags, ...system.planets.flatMap(planet => [planet.name, planet.biome, planet.notes, ...planet.tags]),
        ...system.visits.map(visit => visit.note)
    ].filter(Boolean).join(' ').toLowerCase();
}

export function systemTags(system) {
    return new Set([...system.tags, ...system.planets.flatMap(planet => planet.tags)]);
}

export function packetsLogged(system) {
    return system.visits.reduce((sum, visit) => sum + (Number(visit.packets) || 0), 0);
}

// An outlaw station is ready once `restockHours` have passed since its last visit with packets.
export function outlawStatus(system, restockHours, now = Date.now()) {
    const last = [...system.visits].reverse().find(visit => visit.packets);
    if (!last) return { ready: true, tone: 'new', label: 'Never run', readyAt: 0 };
    const readyAt = Date.parse(last.at) + restockHours * HOUR_MS;
    const wait = readyAt - now;
    return wait <= 0
        ? { ready: true, tone: 'ready', label: 'Ready', readyAt }
        : { ready: false, tone: 'wait', label: `Ready in ${formatDuration(wait)}`, readyAt };
}

// Ready first (never run, then longest since the last run); restocking by soonest ready.
export function rankOutlaw(systems, restockHours, now = Date.now()) {
    return systems
        .filter(system => system.tags.includes(OUTLAW_TAG))
        .map(system => ({ system, status: outlawStatus(system, restockHours, now) }))
        .sort((a, b) => (b.status.ready - a.status.ready) || (a.status.readyAt - b.status.readyAt) || a.system.name.localeCompare(b.system.name));
}
