// Wiki Codex data loading (DOM + storage): the light index, the full bundle, and browser drafts of your own
// articles. The pure search engine is assets/lib/search.js; both are re-exported as `WikiSearch`.
import * as engine from '../lib/search.js';
import { escapeHtml } from '../lib/util.js';

const { prepare } = engine;

const DRAFTS_KEY = 'nms_master_os_wiki_drafts';

function readDrafts() {
    try {
        const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
        return Array.isArray(drafts) ? drafts : [];
    } catch {
        return [];
    }
}

function writeDrafts(drafts) {
    try {
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    } catch (e) {
        console.warn('Could not save wiki drafts:', e);
    }
}

// fetch() is blocked on file://, but a <script> tag is not.
const bundlePromises = {};
function loadBundle(base) {
    bundlePromises[base] ??= new Promise(resolve => {
        const script = document.createElement('script');
        script.src = `${base}offline-bundle.js`;
        script.onload = () => resolve(window.WIKI_OFFLINE_BUNDLE || null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
    });
    return bundlePromises[base];
}

// Articles with bodies (Codex page) or the light index (header search), plus browser drafts.
async function load(base, { withBodies = false } = {}) {
    let entries;
    if (withBodies) {
        entries = (await loadBundle(base))?.articles || [];
    } else {
        try {
            const res = await fetch(`${base}index.json`, { cache: 'no-store', signal: AbortSignal.timeout(8000) }); // then the bundle
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            entries = await res.json();
        } catch {
            entries = (await loadBundle(base))?.articles || [];
        }
    }
    // Drafts that have since been dropped into wiki/custom/ and indexed are no longer needed.
    const indexedPaths = new Set(entries.map(entry => entry.path));
    const drafts = readDrafts().filter(draft => !indexedPaths.has(draft.path));
    writeDrafts(drafts);
    return [...drafts.map(draft => ({ ...draft, source: 'draft' })), ...entries].map(prepare);
}

export const WikiSearch = { ...engine, escapeHtml, readDrafts, writeDrafts, loadBundle, load };
