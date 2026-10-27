// Schema guard for the state document (docs/state-schema.md): imports, the browser copy and the repo's
// nms_state.json all pass through validateState() before they can replace anything.
// Keys may be missing (older exports predate newer keys; buildState() fills defaults), but every key that is
// present must have the right type. Unknown keys are allowed so newer exports still load in older builds.
// Hand-written rather than Zod: no runtime dependency for one small, stable shape (ADR-0001).
import { isPlainObject, SAFE_ID } from './util.js';

const MAX_ERRORS = 5;

export function validateState(state) {
    const errors = [];
    const fail = (path, message) => { if (errors.length < MAX_ERRORS) errors.push({ path, message }); };
    const isDate = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));
    const object = (value, path) => isPlainObject(value) || (fail(path, 'must be an object'), false);
    const array = (value, path) => Array.isArray(value) || (fail(path, 'must be a list'), false);
    const text = (value, path) => typeof value === 'string' || (fail(path, 'must be text'), false);
    const optional = (parent, key, check, path) => { if (parent[key] !== undefined && parent[key] !== null) check(parent[key], `${path}.${key}`); };
    const strings = (value, path) => array(value, path) && value.forEach((item, i) => text(item, `${path}[${i}]`));
    const positive = (value, path) => Number(value) > 0 || fail(path, 'must be a positive number');
    // Ids are interpolated into inline handlers, so only safe characters are accepted (see SAFE_ID in util.js).
    const id = (value, path) => ((typeof value === 'string' || Number.isInteger(value)) && SAFE_ID.test(String(value))) || fail(path, 'must use only letters, digits, - and _');

    if (!isPlainObject(state)) return { ok: false, errors: [{ path: '(root)', message: 'must be a JSON object' }] };

    optional(state, 'meta', (meta, path) => {
        if (!object(meta, path)) return;
        optional(meta, 'lastUpdated', (value, p) => isDate(value) || fail(p, 'must be a date'), path);
        optional(meta, 'currentPhase', text, path);
    }, '');
    optional(state, 'fleet', object, '');
    optional(state, 'checklists', (checklists, path) => {
        if (!object(checklists, path)) return;
        Object.entries(checklists).forEach(([id, done]) => typeof done === 'boolean' || fail(`${path}.${id}`, 'must be true or false'));
    }, '');
    optional(state, 'outlaw', (outlaw, path) => {
        if (!object(outlaw, path)) return;
        ['restockHours', 'packetsPerVisit', 'runSize', 'unitsPerPacket', 'nanitesPerPacket'].forEach(key => optional(outlaw, key, positive, path));
        optional(outlaw, 'stations', (stations, p) => array(stations, p) && stations.forEach((station, i) => {
            if (object(station, `${p}[${i}]`)) optional(station, 'id', id, `${p}[${i}]`);
        }), path); // legacy, migrated by buildState()
    }, '');
    optional(state, 'systems', (systems, path) => {
        if (!array(systems, path)) return;
        systems.forEach((system, i) => {
            const at = `${path}[${i}]`;
            if (!object(system, at)) return;
            text(system.name, `${at}.name`);
            optional(system, 'id', id, at);
            optional(system, 'tags', strings, at);
            optional(system, 'notes', text, at);
            optional(system, 'planets', (planets, p) => array(planets, p) && planets.forEach((planet, j) => {
                if (object(planet, `${p}[${j}]`)) optional(planet, 'id', id, `${p}[${j}]`);
            }), at);
            optional(system, 'visits', (visits, p) => array(visits, p) && visits.forEach((visit, j) => {
                if (object(visit, `${p}[${j}]`) && !isDate(visit.at)) fail(`${p}[${j}].at`, 'must be a date');
            }), at);
        });
    }, '');
    optional(state, 'logbook', (logbook, path) => array(logbook, path) && logbook.forEach((entry, i) => {
        if (object(entry, `${path}[${i}]`)) optional(entry, 'id', id, `${path}[${i}]`);
    }), ''); // legacy, migrated by buildState()

    return { ok: errors.length === 0, errors: errors.map(error => ({ ...error, path: error.path.replace(/^\./, '') })) };
}

// One line a person can act on: "systems[2].name must be text".
export function describeErrors(errors) {
    return errors.map(error => `${error.path} ${error.message}`).join('; ');
}
