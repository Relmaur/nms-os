// Systems log: every star system you visit, with the in-game details, your own tags, planets,
// notes and a visit journal. Outlaw stations are systems tagged "outlaw" (Outlaw Run view).
// State lives in nms_state.json → systems[] + outlaw{}. Uses globals from index.html:
// appState, saveAppState, isPlainObject, escapeHtml, showToast, showSection.

const OUTLAW_TAG = 'outlaw';
const OUTLAW_UNITS_PER_PACKET = 75000;
const OUTLAW_NANITES_PER_PACKET = 350;
const HOUR_MS = 3600 * 1000;

const STAR_CLASSES = {
    yellow: { label: 'Yellow', color: '#facc15' },
    red: { label: 'Red', color: '#f87171' },
    green: { label: 'Green', color: '#4ade80' },
    blue: { label: 'Blue', color: '#60a5fa' },
    purple: { label: 'Purple', color: '#c084fc' }
};
const RACES = { gek: 'Gek', korvax: 'Korvax', vykeen: "Vy'keen", none: 'Uncharted', abandoned: 'Abandoned' };
const CONFLICT_LEVELS = { low: 'Low', medium: 'Medium', high: 'High', pirate: 'Pirate (outlaw)' };
const ECONOMIES = ['Trading', 'Mining', 'Manufacturing', 'Technology', 'Scientific', 'Power Generation', 'Advanced Materials'];
const BIOMES = ['Lush', 'Paradise', 'Barren', 'Frozen', 'Scorched', 'Toxic', 'Irradiated', 'Exotic', 'Dead', 'Marsh', 'Volcanic', 'Waterworld', 'Gas Giant', 'Infested'];
const SUGGESTED_TAGS = [OUTLAW_TAG, 'trade-hub', 'base', 'harmonic-camp', 's-class-ship', 'crash-site', 'portal', 'settlement', 'farming', 'mining', 'paradise', 'exotic', 'to-revisit', 'home'];
const SORTS = { recent: 'Last visited', discovered: 'Newest added', name: 'Name', rating: 'Rating', region: 'Region' };
const LOGBOOK_TYPE_TAGS = { 'S-Class Crash Site': 's-class-ship', 'Harmonic Camp': 'harmonic-camp', 'Outlaw Station': OUTLAW_TAG, 'Hotspot / Base': 'base', 'Custom Guide Note': 'note' };

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
function newId(prefix) {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function tagSlug(value) {
    return String(value ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeGlyphs(value) {
    return String(value || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
}

function clampInt(value, min, max) {
    return Math.min(max, Math.max(min, Math.round(Number(value)) || 0));
}

function normalizeSystem(raw) {
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
function migrateToSystems(state) {
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

function findSystem(id) {
    return appState.systems.find(system => system.id === id);
}

function lastVisit(system) {
    return system.visits[system.visits.length - 1];
}

function allTags() {
    const counts = new Map();
    appState.systems.forEach(system => [...system.tags, ...system.planets.flatMap(planet => planet.tags)]
        .forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
    return counts;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function formatDuration(ms) {
    const minutes = Math.max(1, Math.round(ms / 60000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
    return `${Math.round(hours / 24)}d`;
}

function formatAgo(iso) {
    const ms = Date.now() - Date.parse(iso);
    return ms < 60000 ? 'just now' : `${formatDuration(ms)} ago`;
}

function formatDate(iso) {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function tagChip(tag, { active = false, onclick = '' } = {}) {
    const classes = active
        ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200'
        : tag === OUTLAW_TAG ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-slate-900 border-slate-700 text-slate-300';
    const tagName = onclick ? 'button' : 'span';
    return `<${tagName} ${onclick ? `onclick="${onclick}" aria-pressed="${active}"` : ''} class="inline-flex items-center h-6 px-2 rounded-md border text-[11px] font-medium ${classes} ${onclick ? 'hover:border-slate-500' : ''}">${escapeHtml(tag)}</${tagName}>`;
}

function starDot(system, size = 'w-3 h-3') {
    const color = STAR_CLASSES[system.star]?.color;
    return `<span class="${size} shrink-0 rounded-full ${color ? '' : 'border border-dashed border-slate-600'}" style="${color ? `background:${color}; box-shadow: 0 2px 8px -1px ${color}88` : ''}" title="${escapeHtml(STAR_CLASSES[system.star]?.label || 'Star colour unknown')}"></span>`;
}

function wealthStars(wealth) {
    return wealth ? `<span class="text-amber-300" title="Wealth ${wealth}/3">${'★'.repeat(wealth)}<span class="text-slate-600">${'★'.repeat(3 - wealth)}</span></span>` : '';
}

function glyphChip(glyphs) {
    if (!glyphs) return '';
    return `<button data-glyphs="${escapeHtml(glyphs)}" onclick="event.stopPropagation(); copyGlyphs(this.dataset.glyphs)" title="Copy portal glyphs" class="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-slate-950 border border-slate-700 hover:border-slate-500 font-mono text-[11px] tracking-wider text-slate-200">${escapeHtml(glyphs)}<i class="ph-bold ph-copy text-slate-400"></i></button>`;
}

function copyGlyphs(glyphs) {
    (navigator.clipboard?.writeText(glyphs) || Promise.reject())
        .then(() => showToast(`Copied glyphs ${glyphs}.`))
        .catch(() => showToast(glyphs));
}

// HTML-safe parts for the one-line summary under a system's name.
function systemMeta(system) {
    return [
        escapeHtml(system.region),
        escapeHtml(system.galaxy),
        escapeHtml(RACES[system.race] || ''),
        [escapeHtml(system.economy), wealthStars(system.wealth)].filter(Boolean).join(' '),
        system.conflict ? escapeHtml(`${CONFLICT_LEVELS[system.conflict]}${system.conflict === 'pirate' ? '' : ' conflict'}`) : ''
    ].filter(Boolean);
}

// ---------------------------------------------------------------------------
// Systems list (search, filters, sort)
// ---------------------------------------------------------------------------
const systemFilter = { q: '', tags: [], star: '', race: '', conflict: '', favorites: false, sort: 'recent' };

function systemHaystack(system) {
    return [
        system.name, system.region, system.galaxy, system.economy, system.notes, system.glyphs, RACES[system.race], STAR_CLASSES[system.star]?.label,
        ...system.tags, ...system.planets.flatMap(planet => [planet.name, planet.biome, planet.notes, ...planet.tags]),
        ...system.visits.map(visit => visit.note)
    ].filter(Boolean).join(' ').toLowerCase();
}

function systemTags(system) {
    return new Set([...system.tags, ...system.planets.flatMap(planet => planet.tags)]);
}

function filteredSystems() {
    const tokens = systemFilter.q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = appState.systems.filter(system => {
        if (systemFilter.favorites && !system.favorite) return false;
        if (systemFilter.star && system.star !== systemFilter.star) return false;
        if (systemFilter.race && system.race !== systemFilter.race) return false;
        if (systemFilter.conflict && system.conflict !== systemFilter.conflict) return false;
        const tags = systemTags(system);
        if (!systemFilter.tags.every(tag => tags.has(tag))) return false;
        if (tokens.length) {
            const haystack = systemHaystack(system);
            if (!tokens.every(token => haystack.includes(token))) return false;
        }
        return true;
    });
    const lastAt = system => Date.parse(lastVisit(system)?.at || system.createdAt);
    const sorters = {
        recent: (a, b) => lastAt(b) - lastAt(a),
        discovered: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
        name: (a, b) => a.name.localeCompare(b.name),
        rating: (a, b) => b.rating - a.rating || b.favorite - a.favorite || lastAt(b) - lastAt(a),
        region: (a, b) => (a.region || '~').localeCompare(b.region || '~') || a.name.localeCompare(b.name)
    };
    return list.sort((a, b) => (b.favorite - a.favorite) * (systemFilter.sort === 'name' || systemFilter.sort === 'region' ? 0 : 1) || sorters[systemFilter.sort](a, b));
}

function setSystemFilter(changes) {
    Object.assign(systemFilter, changes);
    renderSystems();
}

function toggleSystemTagFilter(tag) {
    const tags = new Set(systemFilter.tags);
    tags.has(tag) ? tags.delete(tag) : tags.add(tag);
    setSystemFilter({ tags: [...tags] });
}

function clearSystemFilters() {
    Object.assign(systemFilter, { q: '', tags: [], star: '', race: '', conflict: '', favorites: false });
    document.getElementById('systemSearch').value = '';
    renderSystems();
}

function renderSystems() {
    const systems = appState.systems;
    const visible = filteredSystems();
    const visits = systems.reduce((sum, system) => sum + system.visits.length, 0);
    const planets = systems.reduce((sum, system) => sum + system.planets.length, 0);
    document.getElementById('sidebarSystemsCount').textContent = systems.length;
    document.getElementById('systemsSummary').innerHTML = systems.length
        ? `<strong class="text-white">${systems.length}</strong> system${systems.length === 1 ? '' : 's'} · ${planets} planet${planets === 1 ? '' : 's'} · ${visits} visit${visits === 1 ? '' : 's'} logged`
        : 'Nothing logged yet. Warp somewhere and add it. Only the name is required; fill in the rest whenever you like.';

    const select = (id, options, value, label) => {
        document.getElementById(id).innerHTML = `<option value="">${label}</option>` + Object.entries(options).map(([key, text]) => `<option value="${key}" ${value === key ? 'selected' : ''}>${escapeHtml(text.label || text)}</option>`).join('');
    };
    select('systemStarFilter', STAR_CLASSES, systemFilter.star, 'Any star');
    select('systemRaceFilter', RACES, systemFilter.race, 'Any race');
    select('systemConflictFilter', CONFLICT_LEVELS, systemFilter.conflict, 'Any conflict');
    document.getElementById('systemSort').innerHTML = Object.entries(SORTS).map(([key, label]) => `<option value="${key}" ${systemFilter.sort === key ? 'selected' : ''}>${label}</option>`).join('');
    const favButton = document.getElementById('systemFavFilter');
    favButton.setAttribute('aria-pressed', String(systemFilter.favorites));

    const tags = [...allTags().entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    document.getElementById('systemTagFilters').innerHTML = tags.length
        ? tags.map(([tag, n]) => `<button onclick="toggleSystemTagFilter('${escapeHtml(tag)}')" aria-pressed="${systemFilter.tags.includes(tag)}" class="tag-filter">${escapeHtml(tag)} <span class="font-mono opacity-60">${n}</span></button>`).join('')
        : '<span class="text-xs text-slate-400">Tags you add to systems and planets show up here as filters.</span>';

    const active = systemFilter.q || systemFilter.tags.length || systemFilter.star || systemFilter.race || systemFilter.conflict || systemFilter.favorites;
    document.getElementById('systemResultCount').innerHTML = `${visible.length} of ${systems.length}${active ? ' · <button onclick="clearSystemFilters()" class="text-emerald-300 hover:text-emerald-200">Clear filters</button>' : ''}`;

    document.getElementById('systemList').innerHTML = visible.length ? visible.map(system => {
        const last = lastVisit(system);
        const meta = systemMeta(system);
        const status = system.tags.includes(OUTLAW_TAG) ? outlawStatus(system) : null;
        return `
        <li>
            <button onclick="openSystem('${escapeHtml(system.id)}')" class="system-card w-full h-full text-left p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-600 transition space-y-2.5">
                <span class="flex items-start justify-between gap-3">
                    <span class="flex items-center gap-2.5 min-w-0">
                        ${starDot(system)}
                        <strong class="text-[0.9375rem] text-white truncate">${escapeHtml(system.name)}</strong>
                        ${system.favorite ? '<i class="ph-fill ph-star text-amber-300 shrink-0" title="Favourite"></i>' : ''}
                    </span>
                    ${status ? outlawPill(status) : system.rating ? `<span class="text-xs text-amber-300 shrink-0" title="Rating ${system.rating}/5">${'★'.repeat(system.rating)}</span>` : ''}
                </span>
                ${meta.length ? `<span class="block text-xs text-slate-400">${meta.join(' · ')}</span>` : ''}
                ${system.tags.length ? `<span class="flex flex-wrap gap-1">${system.tags.slice(0, 6).map(tag => tagChip(tag)).join('')}${system.tags.length > 6 ? `<span class="text-[11px] text-slate-400 self-center">+${system.tags.length - 6}</span>` : ''}</span>` : ''}
                ${system.notes ? `<span class="block text-xs text-slate-300 line-clamp-2">${escapeHtml(system.notes)}</span>` : ''}
                <span class="block text-[11px] text-slate-400">${last ? `Last visit ${formatAgo(last.at)} · ${system.visits.length} visit${system.visits.length === 1 ? '' : 's'}` : 'No visits logged'}${system.planets.length ? ` · ${system.planets.length} planet${system.planets.length === 1 ? '' : 's'}` : ''}</span>
            </button>
        </li>`;
    }).join('') : `<li class="sm:col-span-2 p-6 rounded-xl border border-dashed border-slate-700 text-center text-sm text-slate-400">${systems.length ? 'No systems match these filters.' : 'Your atlas is empty. Use “Add system” after your next warp.'}</li>`;
}

// ---------------------------------------------------------------------------
// System panel (view + edit) — side panel on desktop, bottom sheet on mobile
// ---------------------------------------------------------------------------
let panelSystemId = null;
let panelMode = 'view';           // 'view' | 'edit'
let panelDraft = null;            // working copy while editing
let editorTags = [];
let editingPlanetId = null;       // planet being edited inline, or 'new'
let pendingDelete = null;         // two-step delete key

function setPanelOpen(open) {
    const panel = document.getElementById('systemPanel');
    panel.classList.toggle('translate-y-full', !open);
    panel.classList.toggle('md:translate-x-full', !open);
    const backdrop = document.getElementById('systemBackdrop');
    backdrop.classList.toggle('opacity-0', !open);
    backdrop.classList.toggle('pointer-events-none', !open);
    document.body.classList.toggle('overflow-hidden', open);
    panel.setAttribute('aria-hidden', String(!open));
}

function openSystem(id) {
    if (!findSystem(id)) return;
    panelSystemId = id;
    panelMode = 'view';
    editingPlanetId = null;
    pendingDelete = null;
    renderSystemPanel();
    setPanelOpen(true);
    document.getElementById('systemPanelScroll').scrollTop = 0;
}

function openSystemEditor(id = null, preset = {}) {
    const existing = id ? findSystem(id) : null;
    panelSystemId = existing ? existing.id : null;
    panelMode = 'edit';
    panelDraft = existing ? structuredClone(existing) : normalizeSystem({ ...preset, id: newId('sys') });
    editorTags = [...panelDraft.tags];
    renderSystemPanel();
    setPanelOpen(true);
    document.getElementById('systemPanelScroll').scrollTop = 0;
    document.getElementById('sysName')?.focus();
}

function closeSystemPanel() {
    if (document.getElementById('systemPanel').getAttribute('aria-hidden') === 'true') return;
    flushNotes();
    setPanelOpen(false);
    panelSystemId = null;
    panelDraft = null;
}

function renderSystemPanel() {
    const body = document.getElementById('systemPanelBody');
    if (panelMode === 'edit') return renderSystemEditor(body);
    const system = findSystem(panelSystemId);
    if (!system) { closeSystemPanel(); return; }
    const outlaw = system.tags.includes(OUTLAW_TAG);
    const status = outlaw ? outlawStatus(system) : null;
    const facts = [
        ['Galaxy', escapeHtml(system.galaxy)],
        ['Region', escapeHtml(system.region)],
        ['Portal glyphs', glyphChip(system.glyphs)],
        ['Star', system.star ? `<span class="inline-flex items-center gap-2">${starDot(system)}${STAR_CLASSES[system.star].label}</span>` : ''],
        ['Dominant race', escapeHtml(RACES[system.race] || '')],
        ['Economy', [escapeHtml(system.economy), wealthStars(system.wealth)].filter(Boolean).join(' ')],
        ['Conflict', escapeHtml(CONFLICT_LEVELS[system.conflict] || '')],
        ['First logged', formatDate(system.createdAt)]
    ].filter(([, value]) => value);
    const visits = [...system.visits].reverse();
    const deleteArmed = pendingDelete === `system:${system.id}`;

    body.innerHTML = `
        <div class="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-5 pt-3 md:pt-5 pb-4 space-y-3">
            <div class="md:hidden flex justify-center"><span class="w-10 h-1 rounded-full bg-slate-700"></span></div>
            <div class="flex items-start gap-3">
                <span class="mt-2">${starDot(system, 'w-3.5 h-3.5')}</span>
                <div class="min-w-0 flex-1">
                    <h2 id="systemPanelTitle" class="font-display font-bold text-xl text-white leading-snug break-words">${escapeHtml(system.name)}</h2>
                    <p class="text-xs text-slate-400 mt-1">${systemMeta(system).join(' · ') || 'No details yet'}</p>
                </div>
                <button onclick="toggleFavorite('${system.id}')" aria-pressed="${system.favorite}" aria-label="${system.favorite ? 'Remove from favourites' : 'Add to favourites'}" class="w-9 h-9 rounded-xl flex items-center justify-center ${system.favorite ? 'text-amber-300' : 'text-slate-400 hover:text-white'} hover:bg-slate-900"><i class="${system.favorite ? 'ph-fill' : 'ph-bold'} ph-star text-lg"></i></button>
                <button onclick="openSystemEditor('${system.id}')" aria-label="Edit system" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900"><i class="ph-bold ph-pencil-simple text-lg"></i></button>
                <button onclick="closeSystemPanel()" aria-label="Close" class="w-9 h-9 -mr-1.5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900"><i class="ph-bold ph-x text-lg"></i></button>
            </div>
            <form onsubmit="logVisitFromPanel(event, '${system.id}')" class="flex flex-wrap items-center gap-2">
                <input id="visitNote" type="text" maxlength="300" placeholder="Visit note (optional)" class="flex-1 min-w-[10rem] h-10 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base sm:text-sm text-white">
                ${outlaw ? `<label class="flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200"><input id="visitPackets" type="checkbox" checked class="accent-emerald-400">Packet run</label>` : ''}
                <button type="submit" class="h-10 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold flex items-center gap-1.5"><i class="ph-bold ph-map-pin"></i>Log visit</button>
            </form>
        </div>

        <div class="px-5 py-5 space-y-8">
            ${status ? `<div class="flex flex-wrap items-center gap-2 text-xs text-slate-300">${outlawPill(status)}<span>${status.tone === 'wait' ? 'Contraband Agent restocking.' : 'Contraband Agent should be stocked.'}</span></div>` : ''}

            <section class="space-y-2">
                <div class="flex items-center justify-between">
                    <h3 class="panel-heading">Your rating</h3>
                    <span class="flex">${[1, 2, 3, 4, 5].map(n => `<button onclick="setSystemRating('${system.id}', ${n})" aria-label="Rate ${n} of 5" class="w-8 h-8 flex items-center justify-center ${n <= system.rating ? 'text-amber-300' : 'text-slate-600 hover:text-slate-400'}"><i class="${n <= system.rating ? 'ph-fill' : 'ph-bold'} ph-star"></i></button>`).join('')}</span>
                </div>
                ${system.tags.length ? `<div class="flex flex-wrap gap-1.5">${system.tags.map(tag => tagChip(tag, { onclick: `filterByTag('${escapeHtml(tag)}')` })).join('')}</div>` : '<p class="text-xs text-slate-400">No tags yet. Use edit to add some.</p>'}
            </section>

            <section class="space-y-2">
                <div class="flex items-center justify-between">
                    <h3 class="panel-heading">Notes</h3>
                    <span id="notesStatus" class="text-[11px] text-slate-400"></span>
                </div>
                <textarea id="systemNotes" rows="5" oninput="queueNotesSave('${system.id}')" onblur="flushNotes()" placeholder="Anything worth remembering: what's here, what to do next time, who to talk to…" class="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-base sm:text-sm leading-relaxed text-white focus:outline-none resize-y">${escapeHtml(system.notes)}</textarea>
            </section>

            ${facts.length ? `
            <section class="space-y-2">
                <h3 class="panel-heading">System</h3>
                <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">${facts.map(([label, value]) => `<dt class="text-slate-400">${label}</dt><dd class="text-slate-100 min-w-0">${value}</dd>`).join('')}</dl>
            </section>` : ''}

            <section class="space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="panel-heading">Planets <span class="font-mono font-normal text-slate-400">${system.planets.length}</span></h3>
                    ${editingPlanetId === 'new' ? '' : `<button onclick="editPlanet('new')" class="text-xs font-medium text-emerald-300 hover:text-emerald-200 flex items-center gap-1"><i class="ph-bold ph-plus"></i>Add planet</button>`}
                </div>
                ${editingPlanetId === 'new' ? planetForm(system) : ''}
                <ul class="space-y-2">${system.planets.map(planet => editingPlanetId === planet.id ? `<li>${planetForm(system, planet)}</li>` : `
                    <li class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                        <div class="flex items-start justify-between gap-2">
                            <p class="min-w-0"><strong class="text-sm text-white">${escapeHtml(planet.name)}</strong> ${planet.biome ? `<span class="text-xs text-slate-400">${escapeHtml(planet.biome)}</span>` : ''}</p>
                            <span class="flex shrink-0">
                                <button onclick="editPlanet('${planet.id}')" aria-label="Edit ${escapeHtml(planet.name)}" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"><i class="ph-bold ph-pencil-simple"></i></button>
                                <button onclick="deletePlanet('${system.id}', '${planet.id}')" aria-label="Delete ${escapeHtml(planet.name)}" class="h-8 ${pendingDelete === `planet:${planet.id}` ? 'px-2 text-xs font-semibold text-rose-200 bg-rose-500/15 border border-rose-500/50' : 'w-8 text-slate-400 hover:text-rose-300 hover:bg-slate-800'} rounded-lg flex items-center justify-center gap-1"><i class="ph-bold ph-trash"></i>${pendingDelete === `planet:${planet.id}` ? 'Delete?' : ''}</button>
                            </span>
                        </div>
                        ${planet.tags.length ? `<div class="flex flex-wrap gap-1">${planet.tags.map(tag => tagChip(tag)).join('')}</div>` : ''}
                        ${planet.notes ? `<p class="text-xs text-slate-300 whitespace-pre-line">${escapeHtml(planet.notes)}</p>` : ''}
                    </li>`).join('')}
                </ul>
                ${!system.planets.length && editingPlanetId !== 'new' ? '<p class="text-xs text-slate-400">No planets logged. Add the ones with bases, hotspots, crash sites or anything else worth finding again.</p>' : ''}
            </section>

            <section class="space-y-3">
                <h3 class="panel-heading">Visit journal <span class="font-mono font-normal text-slate-400">${system.visits.length}</span></h3>
                ${visits.length ? `<ol class="space-y-2">${visits.map((visit, i) => {
                    const index = system.visits.length - 1 - i;
                    return `
                    <li class="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <i class="ph-bold ph-map-pin text-emerald-300 mt-0.5"></i>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs text-slate-400"><time datetime="${visit.at}">${formatDate(visit.at)}</time> · ${formatAgo(visit.at)}${visit.packets ? ` · <span class="text-emerald-300">${visit.packets} packets</span>` : ''}</p>
                            ${visit.note ? `<p class="text-sm text-slate-200 mt-0.5 whitespace-pre-line">${escapeHtml(visit.note)}</p>` : ''}
                        </div>
                        <button onclick="deleteVisit('${system.id}', ${index})" aria-label="Delete this visit" class="h-8 ${pendingDelete === `visit:${system.id}:${index}` ? 'px-2 text-xs font-semibold text-rose-200 bg-rose-500/15 border border-rose-500/50' : 'w-8 text-slate-500 hover:text-rose-300 hover:bg-slate-800'} rounded-lg flex items-center justify-center gap-1 shrink-0"><i class="ph-bold ph-x"></i>${pendingDelete === `visit:${system.id}:${index}` ? 'Delete?' : ''}</button>
                    </li>`;
                }).join('')}</ol>` : '<p class="text-xs text-slate-400">No visits yet. “Log visit” records today’s date and an optional note.</p>'}
            </section>

            <section class="pt-4 border-t border-slate-800">
                <button onclick="deleteSystem('${system.id}')" class="h-9 px-3 rounded-lg border ${deleteArmed ? 'bg-rose-500/15 border-rose-500/60 text-rose-200 font-semibold' : 'border-slate-700 text-slate-400 hover:text-rose-300 hover:border-rose-500/40'} text-xs flex items-center gap-2"><i class="ph-bold ph-trash"></i>${deleteArmed ? 'Click again to delete this system' : 'Delete system'}</button>
            </section>
        </div>`;
}

function planetForm(system, planet = null) {
    return `
        <form onsubmit="savePlanet(event, '${system.id}', '${planet ? planet.id : ''}')" class="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-2.5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input name="name" required maxlength="80" value="${escapeHtml(planet?.name || '')}" placeholder="Planet name *" class="h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-base sm:text-sm text-white">
                <input name="biome" list="biomeOptions" maxlength="40" value="${escapeHtml(planet?.biome || '')}" placeholder="Biome (e.g. Paradise)" class="h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-base sm:text-sm text-white">
            </div>
            <input name="tags" maxlength="200" value="${escapeHtml(planet?.tags.join(', ') || '')}" placeholder="Tags, comma separated (e.g. base, oxygen-hotspot)" class="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-base sm:text-sm text-white">
            <textarea name="notes" rows="2" maxlength="1000" placeholder="Notes" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base sm:text-sm text-white">${escapeHtml(planet?.notes || '')}</textarea>
            <div class="flex justify-end gap-2">
                <button type="button" onclick="editPlanet(null)" class="h-9 px-3 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800">Cancel</button>
                <button type="submit" class="h-9 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold">${planet ? 'Save planet' : 'Add planet'}</button>
            </div>
        </form>`;
}

function renderSystemEditor(body) {
    const draft = panelDraft;
    const isNew = !panelSystemId;
    const segmented = (name, options, value) => `
        <div class="flex flex-wrap gap-1.5" role="radiogroup">${options.map(([key, label, extra = '']) => `
            <button type="button" role="radio" aria-checked="${value === key}" onclick="setDraftField('${name}', '${key}')" class="seg ${value === key ? 'is-on' : ''}">${extra}${label}</button>`).join('')}
        </div>`;
    body.innerHTML = `
        <form id="systemEditor" onsubmit="saveSystemEditor(event)" class="flex flex-col min-h-full">
            <div class="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-5 pt-3 md:pt-5 pb-4">
                <div class="md:hidden flex justify-center mb-3"><span class="w-10 h-1 rounded-full bg-slate-700"></span></div>
                <div class="flex items-center justify-between gap-3">
                    <h2 id="systemPanelTitle" class="font-display font-bold text-lg text-white">${isNew ? 'Add system' : 'Edit system'}</h2>
                    <button type="button" onclick="${isNew ? 'closeSystemPanel()' : `openSystem('${draft.id}')`}" aria-label="Cancel" class="w-9 h-9 -mr-1.5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900"><i class="ph-bold ph-x text-lg"></i></button>
                </div>
            </div>
            <div class="flex-1 px-5 py-5 space-y-5">
                <label class="field">System name <span class="text-rose-300">*</span>
                    <input id="sysName" name="name" required maxlength="80" value="${escapeHtml(isNew && draft.name === 'Unnamed system' ? '' : draft.name)}" placeholder="As shown in the Discoveries / Galaxy Map">
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label class="field">Region<input name="region" maxlength="80" value="${escapeHtml(draft.region)}" placeholder="e.g. Ezdaranit Spur"></label>
                    <label class="field">Galaxy<input name="galaxy" maxlength="40" value="${escapeHtml(draft.galaxy)}" placeholder="Euclid"></label>
                    <label class="field">Portal glyphs<input name="glyphs" maxlength="16" value="${escapeHtml(draft.glyphs)}" placeholder="0123456789AB" autocapitalize="characters" spellcheck="false" class="font-mono uppercase"></label>
                    <label class="field">Economy<input name="economy" list="economyOptions" maxlength="40" value="${escapeHtml(draft.economy)}" placeholder="e.g. Trading"></label>
                </div>
                <div class="space-y-1.5"><p class="field-label">Star colour</p>${segmented('star', [['', 'Unknown'], ...Object.entries(STAR_CLASSES).map(([key, star]) => [key, star.label, `<span class="w-2.5 h-2.5 rounded-full" style="background:${star.color}"></span>`])], draft.star)}</div>
                <div class="space-y-1.5"><p class="field-label">Dominant race</p>${segmented('race', [['', 'Unknown'], ...Object.entries(RACES)], draft.race)}</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-1.5"><p class="field-label">Wealth</p>${segmented('wealth', [['0', 'Unknown'], ['1', '★'], ['2', '★★'], ['3', '★★★']], String(draft.wealth))}</div>
                    <div class="space-y-1.5"><p class="field-label">Conflict</p>${segmented('conflict', [['', '?'], ...Object.entries(CONFLICT_LEVELS).map(([key, label]) => [key, key === 'pirate' ? 'Pirate' : label])], draft.conflict)}</div>
                </div>
                <div class="space-y-1.5">
                    <p class="field-label">Tags</p>
                    <div id="tagEditor" class="flex flex-wrap items-center gap-1.5 min-h-10 p-1.5 rounded-xl bg-slate-900 border border-slate-700 focus-within:border-emerald-400" onclick="document.getElementById('tagInput').focus()"></div>
                    <div id="tagSuggestions" class="flex flex-wrap gap-1.5"></div>
                </div>
                ${isNew ? `
                <label class="field">Notes<textarea name="notes" rows="4" maxlength="5000" placeholder="First impressions, what's here, why it matters">${escapeHtml(draft.notes)}</textarea></label>
                <label class="flex items-center gap-2.5 text-sm text-slate-200"><input name="logVisit" type="checkbox" ${draft.logVisit === false ? '' : 'checked'} class="w-4 h-4 accent-emerald-400">I'm here now (log a visit)</label>` : ''}
            </div>
            <div class="sticky bottom-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-5 py-3 flex items-center justify-end gap-2">
                <p id="editorError" class="mr-auto text-xs text-rose-300"></p>
                <button type="button" onclick="${isNew ? 'closeSystemPanel()' : `openSystem('${draft.id}')`}" class="h-10 px-4 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-900">Cancel</button>
                <button type="submit" class="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold">${isNew ? 'Add system' : 'Save changes'}</button>
            </div>
        </form>`;
    renderTagEditor();
}

// Segmented buttons write straight into the draft; text inputs are read on save.
function setDraftField(name, value) {
    captureEditorInputs();
    panelDraft[name] = name === 'wealth' ? Number(value) : value;
    renderSystemPanel();
}

function captureEditorInputs() {
    const form = document.getElementById('systemEditor');
    if (!form) return;
    ['name', 'region', 'galaxy', 'glyphs', 'economy', 'notes'].forEach(field => {
        if (form.elements[field]) panelDraft[field] = form.elements[field].value;
    });
    panelDraft.logVisit = form.elements.logVisit ? form.elements.logVisit.checked : undefined;
}

function renderTagEditor() {
    const editor = document.getElementById('tagEditor');
    if (!editor) return;
    const typed = document.getElementById('tagInput')?.value || '';
    editor.innerHTML = editorTags.map(tag => `
        <span class="inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-100">${escapeHtml(tag)}<button type="button" onclick="removeEditorTag('${escapeHtml(tag)}')" aria-label="Remove ${escapeHtml(tag)}" class="w-5 h-5 rounded flex items-center justify-center hover:bg-emerald-500/20"><i class="ph-bold ph-x text-[10px]"></i></button></span>`).join('') +
        `<input id="tagInput" type="text" maxlength="40" value="${escapeHtml(typed)}" placeholder="${editorTags.length ? 'Add tag' : 'Type a tag and press Enter'}" oninput="renderTagSuggestions()" onkeydown="onTagKey(event)" class="flex-1 min-w-[8rem] h-7 bg-transparent px-1.5 text-base sm:text-sm text-white focus:outline-none">`;
    renderTagSuggestions();
}

function renderTagSuggestions() {
    const query = tagSlug(document.getElementById('tagInput')?.value || '');
    const pool = [...new Set([...allTags().keys(), ...SUGGESTED_TAGS])].filter(tag => !editorTags.includes(tag) && (!query || tag.includes(query)));
    document.getElementById('tagSuggestions').innerHTML = pool.slice(0, 12).map(tag => `<button type="button" onclick="addEditorTag('${escapeHtml(tag)}')" class="h-7 px-2 rounded-md border border-dashed border-slate-600 text-xs text-slate-300 hover:text-white hover:border-slate-400">+ ${escapeHtml(tag)}</button>`).join('');
}

function addEditorTag(value) {
    const tag = tagSlug(value);
    if (tag && !editorTags.includes(tag)) editorTags.push(tag);
    const input = document.getElementById('tagInput');
    if (input) input.value = '';
    renderTagEditor();
    document.getElementById('tagInput')?.focus();
}

function removeEditorTag(tag) {
    editorTags = editorTags.filter(item => item !== tag);
    renderTagEditor();
}

function onTagKey(event) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        if (event.target.value.trim()) addEditorTag(event.target.value);
    } else if (event.key === 'Backspace' && !event.target.value && editorTags.length) {
        editorTags.pop();
        renderTagEditor();
        document.getElementById('tagInput')?.focus();
    }
}

function saveSystemEditor(event) {
    event.preventDefault();
    captureEditorInputs();
    const pendingTag = document.getElementById('tagInput')?.value;
    if (pendingTag?.trim()) addEditorTag(pendingTag);
    const glyphs = normalizeGlyphs(panelDraft.glyphs);
    const error = message => { document.getElementById('editorError').textContent = message; };
    if (!panelDraft.name.trim()) return error('The system needs a name.');
    if (glyphs && glyphs.length !== 12) return error('Portal glyphs are 12 hex digits (0–9, A–F), or leave them empty.');

    const logNow = panelDraft.logVisit;
    delete panelDraft.logVisit;
    const system = normalizeSystem({ ...panelDraft, glyphs, tags: editorTags, galaxy: panelDraft.galaxy.trim() || 'Euclid' });
    const index = appState.systems.findIndex(item => item.id === system.id);
    if (index === -1) {
        if (logNow) system.visits.push({ at: new Date().toISOString() });
        appState.systems.push(system);
    } else {
        appState.systems[index] = system;
    }
    saveAppState();
    showToast(index === -1 ? `Added ${system.name}.` : `Saved ${system.name}.`);
    openSystem(system.id);
}

// ---------------------------------------------------------------------------
// System actions
// ---------------------------------------------------------------------------
function armDelete(key) {
    pendingDelete = key;
    clearTimeout(armDelete.timer);
    armDelete.timer = setTimeout(() => { pendingDelete = null; renderSystemPanel(); renderOutlaw(); }, 4000);
}

function logVisitFromPanel(event, id) {
    event.preventDefault();
    const system = findSystem(id);
    if (!system) return;
    const note = document.getElementById('visitNote').value.trim();
    const packetRun = document.getElementById('visitPackets')?.checked;
    system.visits.push({ at: new Date().toISOString(), ...(note ? { note } : {}), ...(packetRun ? { packets: appState.outlaw.packetsPerVisit } : {}) });
    saveAppState();
    showToast(`Logged a visit to ${system.name}.`);
}

function toggleFavorite(id) {
    const system = findSystem(id);
    if (!system) return;
    system.favorite = !system.favorite;
    saveAppState();
}

function setSystemRating(id, rating) {
    const system = findSystem(id);
    if (!system) return;
    system.rating = system.rating === rating ? 0 : rating;
    saveAppState();
}

function filterByTag(tag) {
    closeSystemPanel();
    Object.assign(systemFilter, { tags: [tag] });
    showSection('systems');
    renderSystems();
}

let notesTimer = null;
let notesSystemId = null;
function queueNotesSave(id) {
    notesSystemId = id;
    document.getElementById('notesStatus').textContent = 'Editing…';
    clearTimeout(notesTimer);
    notesTimer = setTimeout(flushNotes, 800);
}

// Saves the notes textarea without re-rendering the panel, so typing is never interrupted.
function flushNotes() {
    clearTimeout(notesTimer);
    const textarea = document.getElementById('systemNotes');
    const system = notesSystemId && findSystem(notesSystemId);
    if (!textarea || !system || system.notes === textarea.value) return;
    system.notes = textarea.value;
    appState.meta.lastUpdated = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appState)); } catch (e) { console.warn('Could not save notes:', e); }
    renderSystems();
    const status = document.getElementById('notesStatus');
    if (status) status.textContent = 'Saved';
}

function editPlanet(planetId) {
    editingPlanetId = planetId;
    renderSystemPanel();
    document.querySelector('#systemPanelBody form[onsubmit^="savePlanet"] input[name="name"]')?.focus();
}

function savePlanet(event, systemId, planetId) {
    event.preventDefault();
    const system = findSystem(systemId);
    if (!system) return;
    const form = event.target.elements;
    const fields = {
        name: form.name.value.trim(),
        biome: form.biome.value.trim(),
        tags: form.tags.value.split(',').map(tagSlug).filter(Boolean),
        notes: form.notes.value.trim()
    };
    if (!fields.name) return;
    const planet = system.planets.find(item => item.id === planetId);
    if (planet) Object.assign(planet, fields, { tags: [...new Set(fields.tags)] });
    else system.planets.push({ id: newId('pl'), ...fields, tags: [...new Set(fields.tags)] });
    editingPlanetId = null;
    saveAppState();
}

function deletePlanet(systemId, planetId) {
    if (pendingDelete !== `planet:${planetId}`) { armDelete(`planet:${planetId}`); renderSystemPanel(); return; }
    const system = findSystem(systemId);
    system.planets = system.planets.filter(planet => planet.id !== planetId);
    pendingDelete = null;
    saveAppState();
}

function deleteVisit(systemId, index) {
    const key = `visit:${systemId}:${index}`;
    if (pendingDelete !== key) { armDelete(key); renderSystemPanel(); return; }
    findSystem(systemId)?.visits.splice(index, 1);
    pendingDelete = null;
    saveAppState();
}

function deleteSystem(id) {
    const key = `system:${id}`;
    if (pendingDelete !== key) { armDelete(key); renderSystemPanel(); renderOutlaw(); return; }
    const system = findSystem(id);
    appState.systems = appState.systems.filter(item => item.id !== id);
    pendingDelete = null;
    closeSystemPanel();
    saveAppState();
    showToast(`Deleted ${system?.name || 'system'}.`);
}

// ---------------------------------------------------------------------------
// Outlaw Run: systems tagged "outlaw", ready once restockHours passed since the last packet run
// ---------------------------------------------------------------------------
function outlawSystems() {
    return appState.systems.filter(system => system.tags.includes(OUTLAW_TAG));
}

function outlawStatus(system) {
    const last = [...system.visits].reverse().find(visit => visit.packets);
    if (!last) return { ready: true, tone: 'new', label: 'Never run', readyAt: 0 };
    const readyAt = Date.parse(last.at) + appState.outlaw.restockHours * HOUR_MS;
    const wait = readyAt - Date.now();
    return wait <= 0
        ? { ready: true, tone: 'ready', label: 'Ready', readyAt }
        : { ready: false, tone: 'wait', label: `Ready in ${formatDuration(wait)}`, readyAt };
}

function outlawPill(status) {
    const tones = {
        new: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/30',
        ready: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
        wait: 'bg-amber-500/10 text-amber-200 border-amber-500/30'
    };
    const icons = { new: 'ph-sparkle', ready: 'ph-check-circle', wait: 'ph-hourglass-medium' };
    return `<span class="inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[11px] font-medium whitespace-nowrap shrink-0 ${tones[status.tone]}"><i class="ph-bold ${icons[status.tone]}"></i>${status.label}</span>`;
}

function packetsLogged(system) {
    return system.visits.reduce((sum, visit) => sum + (Number(visit.packets) || 0), 0);
}

// Ready first (never run, then longest since the last run); restocking by soonest ready.
function sortedOutlaw() {
    return outlawSystems()
        .map(system => ({ system, status: outlawStatus(system) }))
        .sort((a, b) => (b.status.ready - a.status.ready) || (a.status.readyAt - b.status.readyAt) || a.system.name.localeCompare(b.system.name));
}

let outlawFilter = 'all';

function renderOutlaw() {
    const outlaw = appState.outlaw;
    const rows = sortedOutlaw();
    const ready = rows.filter(row => row.status.ready);
    const runs = rows.reduce((sum, row) => sum + row.system.visits.filter(visit => visit.packets).length, 0);
    const packets = rows.reduce((sum, row) => sum + packetsLogged(row.system), 0);

    document.getElementById('sidebarOutlawCount').textContent = rows.length ? `${ready.length}/${rows.length}` : '0';
    document.getElementById('outlawSummary').innerHTML = rows.length
        ? `<strong class="text-white">${rows.length}</strong> outlaw system${rows.length === 1 ? '' : 's'} · <strong class="text-emerald-300">${ready.length} ready</strong> · ${runs} packet run${runs === 1 ? '' : 's'} · ~${(packets * OUTLAW_NANITES_PER_PACKET).toLocaleString()} Nanites earned so far`
        : 'No outlaw systems yet. Add the ones you use (10–20 makes a good rotation). They’re regular systems tagged “outlaw”, so they also show up under Systems.';
    document.getElementById('outlawRestockHours').value = outlaw.restockHours;
    document.getElementById('outlawPacketsPerVisit').value = outlaw.packetsPerVisit;
    document.getElementById('outlawRunSize').innerHTML = Array.from({ length: 15 }, (_, i) => `<option value="${i + 1}" ${outlaw.runSize === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('');

    const run = ready.slice(0, outlaw.runSize);
    const runPackets = run.length * outlaw.packetsPerVisit;
    document.getElementById('outlawRunList').innerHTML = run.length
        ? run.map(({ system }, i) => `
            <li class="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span class="nav-tile text-emerald-300 mt-0.5">${i + 1}</span>
                <div class="min-w-0 flex-1 space-y-1">
                    <button onclick="openSystem('${system.id}')" class="block max-w-full text-left">
                        <span class="block text-sm font-semibold text-white truncate hover:underline underline-offset-2">${escapeHtml(system.name)}</span>
                        <span class="block text-xs text-slate-400 truncate">${escapeHtml([system.region, system.galaxy].filter(Boolean).join(' · '))}</span>
                    </button>
                    ${glyphChip(system.glyphs)}
                </div>
                <button onclick="logPacketRun('${system.id}')" class="shrink-0 h-9 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 text-xs font-semibold flex items-center gap-1.5"><i class="ph-bold ph-check"></i>Visited</button>
            </li>`).join('')
        : `<li class="p-4 rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">${rows.length
            ? `Every station is restocking. Next one ready in ${formatDuration(rows[0].status.readyAt - Date.now())} (${escapeHtml(rows[0].system.name)}).`
            : 'Add outlaw systems to plan a run.'}</li>`;
    document.getElementById('outlawRunFooter').innerHTML = run.length ? `
        <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p class="text-xs text-slate-300">${run.length} station${run.length === 1 ? '' : 's'} · ${runPackets} packets · ~${(runPackets * OUTLAW_UNITS_PER_PACKET / 1e6).toFixed(1)}M Units → <strong class="text-emerald-300">~${(runPackets * OUTLAW_NANITES_PER_PACKET).toLocaleString()} Nanites</strong></p>
            ${run.length > 1 ? '<button onclick="logOutlawRun()" class="h-9 px-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-200">Mark whole run visited</button>' : ''}
        </div>` : '';

    const filters = [['all', 'All', rows.length], ['ready', 'Ready', ready.length], ['wait', 'Restocking', rows.length - ready.length]];
    document.getElementById('outlawFilters').innerHTML = filters.map(([key, label, n]) => `
        <button onclick="outlawFilter = '${key}'; renderOutlaw()" aria-pressed="${outlawFilter === key}" class="h-8 px-3 rounded-full border text-xs font-medium transition ${outlawFilter === key ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'}">${label} <span class="font-mono opacity-70">${n}</span></button>`).join('');
    const visible = rows.filter(row => outlawFilter === 'all' || (outlawFilter === 'ready') === row.status.ready);
    document.getElementById('outlawStationList').innerHTML = visible.length ? visible.map(({ system, status }) => {
        const last = [...system.visits].reverse().find(visit => visit.packets);
        const runCount = system.visits.filter(visit => visit.packets).length;
        return `
        <li class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div class="flex flex-wrap items-start justify-between gap-2">
                <button onclick="openSystem('${system.id}')" class="min-w-0 text-left"><strong class="text-sm text-white hover:underline underline-offset-2">${escapeHtml(system.name)}</strong> <span class="block text-xs text-slate-400">${escapeHtml([system.region, system.galaxy].filter(Boolean).join(' · '))}</span></button>
                ${outlawPill(status)}
            </div>
            ${system.glyphs || system.notes ? `<div class="flex flex-wrap items-center gap-2">${glyphChip(system.glyphs)}${system.notes ? `<span class="text-xs text-slate-300 line-clamp-1">${escapeHtml(system.notes.split('\n')[0])}</span>` : ''}</div>` : ''}
            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span class="text-xs text-slate-400">${runCount ? `${runCount} run${runCount === 1 ? '' : 's'} · last ${formatAgo(last.at)} · ~${(packetsLogged(system) * OUTLAW_NANITES_PER_PACKET).toLocaleString()} Nanites` : 'No packet runs yet'}</span>
                <div class="flex items-center gap-1.5">
                    <button onclick="logPacketRun('${system.id}')" class="h-8 px-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 text-xs font-semibold flex items-center gap-1"><i class="ph-bold ph-check"></i>Visited</button>
                    ${runCount ? `<button onclick="undoPacketRun('${system.id}')" title="Undo last run" aria-label="Undo last run at ${escapeHtml(system.name)}" class="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"><i class="ph-bold ph-arrow-counter-clockwise"></i></button>` : ''}
                    <button onclick="openSystem('${system.id}')" title="Open system" aria-label="Open ${escapeHtml(system.name)}" class="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"><i class="ph-bold ph-arrow-right"></i></button>
                </div>
            </div>
        </li>`;
    }).join('') : `<li class="p-4 rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">${rows.length ? 'No stations in this view.' : 'Your outlaw list is empty. Use “Add outlaw system”, or paste a whole list at once.'}</li>`;
}

function setOutlawSetting(key, value) {
    const limits = { restockHours: [1, 720], packetsPerVisit: [1, 99], runSize: [1, 15] };
    const [min, max] = limits[key];
    appState.outlaw[key] = Math.min(max, Math.max(min, Math.round(Number(value)) || min));
    saveAppState();
}

function logPacketRun(id) {
    const system = findSystem(id);
    if (!system) return;
    system.visits.push({ at: new Date().toISOString(), packets: appState.outlaw.packetsPerVisit });
    saveAppState();
    showToast(`Logged ${system.name}. Ready again in ${appState.outlaw.restockHours}h.`);
}

function logOutlawRun() {
    const run = sortedOutlaw().filter(row => row.status.ready).slice(0, appState.outlaw.runSize);
    const at = new Date().toISOString();
    run.forEach(({ system }) => system.visits.push({ at, packets: appState.outlaw.packetsPerVisit }));
    saveAppState();
    showToast(`Logged a run of ${run.length} stations.`);
}

function undoPacketRun(id) {
    const system = findSystem(id);
    if (!system) return;
    for (let i = system.visits.length - 1; i >= 0; i--) {
        if (system.visits[i].packets) { system.visits.splice(i, 1); break; }
    }
    saveAppState();
    showToast(`Removed the last run at ${system.name}.`);
}

function toggleOutlawBulk(open) {
    document.getElementById('outlawBulkForm').classList.toggle('hidden', !open);
    document.getElementById('outlawBulkError').classList.add('hidden');
    if (open) document.getElementById('outlawBulkInput').focus();
}

function saveOutlawBulk(event) {
    event.preventDefault();
    const fail = message => {
        const error = document.getElementById('outlawBulkError');
        error.textContent = message;
        error.classList.remove('hidden');
    };
    const lines = document.getElementById('outlawBulkInput').value.split('\n').map(line => line.trim()).filter(Boolean);
    const parsed = lines.map(line => {
        const [name, glyphs, region, ...notes] = line.split('|').map(part => part.trim());
        return { name, glyphs: normalizeGlyphs(glyphs), region, notes: notes.join(' | ') };
    });
    if (!parsed.length) return fail('Paste at least one system, one per line.');
    const bad = parsed.findIndex(item => !item.name || (item.glyphs && item.glyphs.length !== 12));
    if (bad !== -1) return fail(`Line ${bad + 1}: needs a name, and glyphs must be exactly 12 hex digits.`);
    parsed.forEach(item => appState.systems.push(normalizeSystem({ ...item, id: newId('sys'), conflict: 'pirate', tags: [OUTLAW_TAG] })));
    document.getElementById('outlawBulkInput').value = '';
    toggleOutlawBulk(false);
    saveAppState();
    showToast(`Added ${parsed.length} outlaw system${parsed.length === 1 ? '' : 's'}.`);
}

// Panel keyboard + keeping countdowns current while the app stays open.
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('systemPanel')?.getAttribute('aria-hidden') === 'false') {
        if (panelMode === 'edit' && panelSystemId) openSystem(panelSystemId);
        else closeSystemPanel();
    }
});

setInterval(() => {
    if (!appState.systems) return;
    renderOutlaw();
    renderSystems();
}, 60000);

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('economyOptions').innerHTML = ECONOMIES.map(value => `<option value="${value}">`).join('');
    document.getElementById('biomeOptions').innerHTML = BIOMES.map(value => `<option value="${value}">`).join('');
});
