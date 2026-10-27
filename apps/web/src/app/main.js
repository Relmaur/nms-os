// Main page: the header (search, Export/Import), the sidebar counts and the storage banner, which are still
// vanilla; it loads the state and mounts the React screens (src/ui).
import { escapeHtml } from '@atlas/core/util';
import { systemHaystack } from '@atlas/core/systems-model';
import { guideProgress } from '@atlas/core/guides';
import { WikiSearch } from './wiki-data.js';
import { appState, loadAppState, onSave, onStorageStatus } from './store.ts';
import { showToast } from './ui.ts';
import { exportState, importState } from './backup.ts';
import { showSection, onSection } from './nav.js';
import { STAR_CLASSES } from '@atlas/core/systems-model';
import { openSystem, openSystemEditor } from '../ui/systems/panel-store.ts';
import { updateOutlawBadges } from './companion.js';
import { mountScreens } from '../ui/mount.tsx';
import { registerServiceWorker } from './pwa.js';
import { loadGameData } from '../ui/calculators/game-data.ts';
import { startDevice } from '../ui/more/device-store.ts';
import { setWikiCount } from '../ui/more/wiki-count.ts';

registerServiceWorker();
startDevice();

// The vanilla counts around the React screens, which re-render on their own.
function renderAll() {
  document.getElementById('sidebarSystemsCount').textContent = appState.systems.length;
  document.querySelector('[data-guides-progress]').textContent = `${guideProgress(appState.checklists).pct}%`;
  updateOutlawBadges();
}

// =========================================================================
// 3. GLOBAL SEARCH (navigation lives in assets/app/nav.js)
// =========================================================================
const SEARCH_WIKI_LIMIT = 6;
const SEARCH_BOOK_LIMIT = 6;
const SEARCH_SYSTEM_LIMIT = 5;
const SEARCH_BLOCKS = 'h2, h3, p, li, tr, [data-check]';
let wikiEntries = [];
let searchHits = [];
let searchActiveIndex = -1;

// A system's star colour as markup, for the search results (the React screens use src/ui/parts/SystemBits.tsx).
function starDot(system) {
  const star = STAR_CLASSES[system.star];
  return `<span class="w-3 h-3 shrink-0 rounded-full ${star ? '' : 'border border-dashed border-slate-600'}" style="${star ? `background:${star.color}; box-shadow: 0 2px 8px -1px ${star.color}88` : ''}" title="${escapeHtml(star?.label || 'Star colour unknown')}"></span>`;
}

function snippetAround(text, token, radius = 70) {
  const at = Math.max(0, text.toLowerCase().indexOf(token));
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + token.length + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

// Book text lives in the DOM (all six books stay mounted), so search the smallest text blocks of each book, hidden
// ones included.
function findBookHits(tokens) {
  const hits = [];
  const seen = new Set();
  document.querySelectorAll('.book-section[id^="sec-book"]').forEach(section => {
    const sectionTitle = section.querySelector('h1')?.textContent.trim() || section.id;
    section.querySelectorAll(SEARCH_BLOCKS).forEach(el => {
      if (el.querySelector(SEARCH_BLOCKS)) return; // prefer the innermost block
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      const lower = text.toLowerCase();
      if (!text || seen.has(lower) || !tokens.every(token => lower.includes(token))) return;
      seen.add(lower);
      const isHeading = /^H[23]$/.test(el.tagName);
      hits.push({ type: 'book', el, sectionKey: section.id.slice(4), sectionTitle, text, score: isHeading ? 2 : 1 });
    });
  });
  return hits.sort((a, b) => b.score - a.score).slice(0, SEARCH_BOOK_LIMIT);
}

function handleGlobalSearch(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const panel = document.getElementById('globalSearchResults');
  const input = document.getElementById('globalSearchInput');
  searchActiveIndex = -1;
  if (!tokens.length) {
    searchHits = [];
    panel.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
    return;
  }

  const wikiMatches = WikiSearch.search(wikiEntries, query).map(result => result.entry);
  const wikiHits = wikiMatches.slice(0, SEARCH_WIKI_LIMIT).map(entry => ({ type: 'wiki', entry }));
  const systemMatches = appState.systems.filter(system => {
    const haystack = systemHaystack(system);
    return tokens.every(token => haystack.includes(token));
  });
  const systemHits = systemMatches.slice(0, SEARCH_SYSTEM_LIMIT).map(system => ({ type: 'system', system }));
  const bookHits = findBookHits(tokens);
  searchHits = [...systemHits, ...wikiHits, ...bookHits];

  const groupLabel = (label, detail) =>
    `<p class="flex justify-between px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"><span>${label}</span><span class="normal-case tracking-normal font-mono font-normal">${detail}</span></p>`;
  let html = '';
  if (systemHits.length) {
    html += groupLabel('Your systems', `${systemMatches.length}`);
    html += systemHits
      .map(
        (hit, i) => `
            <button id="search-hit-${i}" role="option" aria-selected="false" onclick="activateSearchHit(${i})" class="search-hit">
                <span class="nav-tile mt-0.5">${starDot(hit.system)}</span>
                <span class="min-w-0 flex-1">
                    <strong class="block text-sm text-white truncate">${WikiSearch.highlight(hit.system.name, tokens)}</strong>
                    <span class="block text-xs text-slate-400 truncate">${escapeHtml([hit.system.region, ...hit.system.tags].filter(Boolean).join(' · ') || hit.system.galaxy)}</span>
                </span>
            </button>`
      )
      .join('');
  }
  if (wikiHits.length) {
    html += groupLabel('Wiki articles', `${wikiMatches.length} match${wikiMatches.length === 1 ? '' : 'es'}`);
    html += wikiHits
      .map((hit, j) => {
        const i = systemHits.length + j;
        return `
            <button id="search-hit-${i}" role="option" aria-selected="false" onclick="activateSearchHit(${i})" class="search-hit">
                <span class="nav-tile text-emerald-300 mt-0.5"><i class="ph-bold ${WikiSearch.CATEGORIES[hit.entry.category]?.icon || 'ph-file-text'}"></i></span>
                <span class="min-w-0 flex-1">
                    <span class="flex items-center gap-2"><strong class="text-sm text-white truncate">${WikiSearch.highlight(hit.entry.title, tokens)}</strong>${WikiSearch.badge(hit.entry.source)}</span>
                    <span class="block text-xs text-slate-400 truncate">${escapeHtml(hit.entry.category)} · ${escapeHtml(hit.entry.summary || '')}</span>
                </span>
            </button>`;
      })
      .join('');
    if (wikiMatches.length > wikiHits.length) {
      html += `<button onclick="showAllWikiResults()" class="w-full px-3 py-2 text-left text-xs font-medium text-cyan-300 hover:text-cyan-200">Show all ${wikiMatches.length} wiki results →</button>`;
    }
  }
  if (bookHits.length) {
    html += groupLabel('In the manual', `${bookHits.length}${bookHits.length === SEARCH_BOOK_LIMIT ? '+' : ''}`);
    html += bookHits
      .map((hit, j) => {
        const i = systemHits.length + wikiHits.length + j;
        return `
            <button id="search-hit-${i}" role="option" aria-selected="false" onclick="activateSearchHit(${i})" class="search-hit">
                <span class="nav-tile text-cyan-300 mt-0.5"><i class="ph-bold ph-book-open"></i></span>
                <span class="min-w-0 flex-1">
                    <span class="block text-[11px] font-medium text-cyan-300/80 truncate">${escapeHtml(hit.sectionTitle)}</span>
                    <span class="search-snippet block text-xs text-slate-300 leading-relaxed">${WikiSearch.highlight(snippetAround(hit.text, tokens[0]), tokens)}</span>
                </span>
            </button>`;
      })
      .join('');
  }
  if (!searchHits.length) {
    html = `<p class="px-3 py-6 text-center text-sm text-slate-400">Nothing matches “${escapeHtml(query.trim())}”. Try fewer words.</p>`;
  }
  panel.innerHTML = html;
  panel.classList.remove('hidden');
  input.setAttribute('aria-expanded', 'true');
}

function setSearchActive(index) {
  if (!searchHits.length) return;
  searchActiveIndex = (index + searchHits.length) % searchHits.length;
  searchHits.forEach((_, i) => {
    const el = document.getElementById(`search-hit-${i}`);
    el?.setAttribute('aria-selected', String(i === searchActiveIndex));
    if (i === searchActiveIndex) el?.scrollIntoView({ block: 'nearest' });
  });
  document.getElementById('globalSearchInput').setAttribute('aria-activedescendant', `search-hit-${searchActiveIndex}`);
}

function handleGlobalSearchKey(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setSearchActive(searchActiveIndex + 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    setSearchActive(searchActiveIndex - 1);
  } else if (event.key === 'Enter' && searchHits.length) {
    event.preventDefault();
    activateSearchHit(Math.max(searchActiveIndex, 0));
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeGlobalSearch();
  }
}

function activateSearchHit(index) {
  const hit = searchHits[index];
  if (!hit) return;
  const query = document.getElementById('globalSearchInput').value;
  closeGlobalSearch();
  if (hit.type === 'system') {
    showSection('systems');
    openSystem(hit.system.id);
    return;
  }
  if (hit.type === 'wiki') {
    location.href = `wiki/#/a/${encodeURIComponent(hit.entry.path)}?q=${encodeURIComponent(query)}`;
    return;
  }
  showSection(hit.sectionKey);
  const el = hit.el.isConnected ? hit.el : null;
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('search-flash');
    void el.offsetWidth; // restart the animation on repeat jumps
    el.classList.add('search-flash');
    setTimeout(() => el.classList.remove('search-flash'), 2300);
  });
}

function showAllWikiResults() {
  const query = document.getElementById('globalSearchInput').value;
  closeGlobalSearch();
  location.href = `wiki/#/?q=${encodeURIComponent(query)}`;
}

function openGlobalSearch() {
  document.body.classList.add('search-open', 'overflow-hidden');
  const input = document.getElementById('globalSearchInput');
  input.focus();
  handleGlobalSearch(input.value);
}

function closeGlobalSearch() {
  document.body.classList.remove('search-open', 'overflow-hidden');
  document.getElementById('globalSearchResults').classList.add('hidden');
  const input = document.getElementById('globalSearchInput');
  input.setAttribute('aria-expanded', 'false');
  input.blur();
}

document.addEventListener('pointerdown', event => {
  if (!document.getElementById('globalSearch').contains(event.target)) {
    document.getElementById('globalSearchResults').classList.add('hidden');
    document.getElementById('globalSearchInput').setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', event => {
  const typing =
    /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if ((event.key === '/' && !typing) || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) {
    event.preventDefault();
    if (window.innerWidth < 768) openGlobalSearch();
    else document.getElementById('globalSearchInput').focus();
  }
});

// Back/forward and home-screen shortcuts (./#calculators) change only the hash.
window.addEventListener('hashchange', () => showSection(location.hash.slice(1) || 'home'));

window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) document.body.classList.remove('search-open');
});

// =========================================================================
// 4. EXPORT / IMPORT from the header (logic in backup.ts, shared with More)
// =========================================================================
function exportStateJSON() {
  exportState();
}

function setStorageBanner(message, { offerExport = false } = {}) {
  const banner = document.getElementById('storageBanner');
  document.getElementById('storageBannerText').textContent = message;
  document.getElementById('storageBannerExport').classList.toggle('hidden', !offerExport);
  banner.classList.toggle('hidden', !message);
  banner.classList.toggle('flex', Boolean(message));
}

function dismissStorageBanner() {
  setStorageBanner('');
}

onStorageStatus(status => {
  if (status.saveFailed)
    setStorageBanner(
      'Not saved on this device: the browser refused to store your changes (storage may be full, or this is a private window). They’re kept until you close the app, so export a backup now.',
      { offerExport: true }
    );
  else if (status.saveFailed === false) setStorageBanner('');
  if (status.unreadableNotKept)
    setStorageBanner(
      'Your saved data in this browser couldn’t be read, and there’s no room to keep a copy aside, so the app won’t write over it: changes you make now are not saved. Export them if you need them, then free up browser storage and reload.',
      { offerExport: true }
    );
  if (status.recoveredKey)
    setStorageBanner(
      `Your saved data in this browser couldn’t be read, so the app started from the default state. Nothing was deleted: the unreadable copy is kept in this browser under “${status.recoveredKey}”.`
    );
  if (status.fromOtherTab) showToast('Updated with changes from another tab.');
});

function importStateJSON(event) {
  importState(event.target.files[0]);
  event.target.value = ''; // allow re-importing the same file
}

function setDropzoneActive(active) {
  const zone = document.getElementById('importDropzone');
  zone.classList.toggle('border-amber-400', active);
  zone.classList.toggle('bg-amber-500/10', active);
}

function handleStateDragOver(event) {
  event.preventDefault();
  setDropzoneActive(true);
}

function handleStateDrop(event) {
  event.preventDefault();
  setDropzoneActive(false);
  importState(event.dataTransfer.files[0]);
}

onSave(renderAll);
onSection('calculators', loadGameData);
onSection('new-system', () => openSystemEditor());

(async function init() {
  WikiSearch.load('wiki/').then(entries => {
    wikiEntries = entries;
    const current = entries.filter(entry => !WikiSearch.isOld(entry)).length;
    document.getElementById('sidebarWikiCount').textContent = current.toLocaleString();
    setWikiCount(current);
  });
  await loadAppState();
  mountScreens(); // after loading, so no screen flashes the built-in defaults
  renderAll();
  showSection(location.hash.slice(1) || 'home'); // after state loads, so #new-system can open the editor
})();

// Called from inline on…="" handlers in the markup and in rendered templates.
Object.assign(window, {
  handleGlobalSearch,
  handleGlobalSearchKey,
  openGlobalSearch,
  closeGlobalSearch,
  activateSearchHit,
  showAllWikiResults,
  exportStateJSON,
  importStateJSON,
  dismissStorageBanner,
  handleStateDragOver,
  handleStateDrop,
  setDropzoneActive
});
