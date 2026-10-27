// App state: defaults, layered merge and migrations (pure, no DOM). Shape: docs/state-schema.md.
import { isPlainObject } from './util.js';
import { migrateToSystems } from './systems-model.js';

// Mirrors the repo's nms_state.json; used when that file can't be fetched (e.g. opened via file://).
export const DEFAULT_STATE = {
    meta: {
        version: '2.0.0',
        lastUpdated: '2026-10-26',
        platforms: ['PC', 'Mac', 'Switch', 'iOS'],
        currentPhase: 'Phase 3: Anomalous Doughnut Scanner & Base Setup'
    },
    fleet: {
        primaryStarship: {
            name: 'Ythgall',
            class: 'S',
            type: 'Sentinel Interceptor',
            superchargedSlots: ['R2C2', 'R2C3', 'R2C4', 'R3C7'],
            layoutNotes: '3-in-a-row horizontal SC bar on Row 2 (Cols 2,3,4). Put Infra-Knife Accelerator in R2C3 flanked by S/X upgrades in R2C2 and R2C4.'
        },
        salvageStarship: {
            name: 'Aeron-ημ',
            class: 'S',
            type: 'Sentinel Interceptor',
            status: 'Ready to store tech and scrap for ~50M Units + Storage Augmentations'
        },
        multiTools: [
            {
                name: 'Defiance of Thought',
                class: 'A -> S',
                type: 'Sentinel Long-Rifle',
                role: 'Dedicated Combat & Double-Laser Mining',
                notes: 'Supercharged slots hidden in locked Cols 9-10 / Row 4. Unlock via free Multi-Tool Expansion Slots from Anomaly decommissioning.'
            },
            {
                name: 'Light Capacitor 3-93F/33Q',
                class: 'A',
                type: 'Standard Rifle (40 Slots Unlocked)',
                superchargedSlots: ['R1C8', 'R2C4', 'R4C6'],
                role: 'Active Scanner & Optical Drill Harvester',
                notes: 'S-Class Scanner mod in R1C8; place Optical Drill in R2C4 for +88% plant yields.'
            }
        ]
    },
    checklists: {
        crossSaveLinked: true,
        anomalyUnlocked: true,
        harmonicCampUnlocked: true,
        sClassInterceptorSecured: true,
        sentinelRifleSecured: true,
        nutrientIngestorInstalled: false,
        anomalousDoughnutBatchCooked: false,
        capitalFreighterClaimed: false,
        oxygenAlchemyBaseBuilt: false,
        autophageUnlocked: false
    },
    outlaw: {
        restockHours: 24,
        packetsPerVisit: 15,
        runSize: 5,
        unitsPerPacket: 75000,  // your own in-game averages, not game data
        nanitesPerPacket: 350
    },
    systems: [
        {
            id: 'camp-01',
            name: 'Dissonant System #1',
            galaxy: 'Euclid',
            tags: ['harmonic-camp'],
            notes: 'Spawned S-Class Interceptors Ythgall and Aeron-ημ + B-Class Sentinel Rifle Defiance of Thought\nHarmonic Camp solution: 4, 10, 16',
            planets: [],
            visits: [],
            createdAt: '2026-10-26T00:00:00.000Z'
        }
    ]
};

// Objects merge key-by-key; arrays and scalars from `patch` replace those in `base`.
export function deepMerge(base, patch) {
    if (patch === undefined) return base;
    if (!isPlainObject(base) || !isPlainObject(patch)) return structuredClone(patch);
    const merged = { ...base };
    Object.keys(patch).forEach(key => {
        merged[key] = deepMerge(base[key], patch[key]);
    });
    return merged;
}

// Pre-2.0 shape ({ checkedItems, logEntries }) → nms_state.json shape.
export function migrateLegacyState(legacy) {
    if (!('checkedItems' in legacy) && !('logEntries' in legacy)) return legacy;
    return {
        meta: { lastUpdated: legacy.lastUpdated },
        checklists: legacy.checkedItems || {},
        logbook: (legacy.logEntries || []).map(entry => ({
            id: String(entry.id),
            system: entry.title,
            type: entry.category,
            glyphSolution: [],
            notes: entry.details
        }))
    };
}

export function buildState(...layers) {
    const state = layers.filter(isPlainObject).reduce(deepMerge, structuredClone(DEFAULT_STATE));
    if (!isPlainObject(state.meta)) state.meta = structuredClone(DEFAULT_STATE.meta);
    if (!isPlainObject(state.fleet)) state.fleet = {};
    if (!isPlainObject(state.checklists)) state.checklists = {};
    if (!isPlainObject(state.outlaw)) state.outlaw = structuredClone(DEFAULT_STATE.outlaw);
    migrateToSystems(state); // folds old logbook[] / outlaw.stations[] into systems[]
    ['restockHours', 'packetsPerVisit', 'runSize', 'unitsPerPacket', 'nanitesPerPacket'].forEach(key => {
        if (!(Number(state.outlaw[key]) > 0)) state.outlaw[key] = DEFAULT_STATE.outlaw[key];
    });
    return state;
}

export function stateTimestamp(state) {
    return Date.parse(state?.meta?.lastUpdated) || 0;
}
