// Wiki Codex data loading (DOM + storage): the light index, the full bundle, and browser drafts of your own
// articles. The pure search engine is assets/lib/search.js; both are re-exported as `WikiSearch`.
import * as engine from '@atlas/core/search';
import { escapeHtml } from '@atlas/core/util';
import { WikiIndexSchema, parseBundle, parseDrafts } from '@atlas/core/wiki-files';

const { prepare } = engine;

const DRAFTS_KEY = 'nms_master_os_wiki_drafts';

function readDrafts() {
  try {
    return parseDrafts(JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]'));
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

// fetch() is blocked on file://, but a <script> tag is not. Malformed articles are left out (and logged).
const bundlePromises = {};
function loadBundle(base) {
  bundlePromises[base] ??= new Promise(resolve => {
    const script = document.createElement('script');
    script.src = `${base}offline-bundle.js`;
    script.onload = () => {
      const parsed = parseBundle(window.WIKI_OFFLINE_BUNDLE);
      if (!parsed || parsed.dropped)
        console.warn('[atlas]', { event: 'wiki-bundle-invalid', dropped: parsed?.dropped });
      resolve(parsed?.bundle ?? null);
    };
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
      entries = WikiIndexSchema.parse(await res.json()); // malformed: fall back to the bundle
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
