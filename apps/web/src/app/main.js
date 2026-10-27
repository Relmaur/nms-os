// Main page: renders every section from the app state, plus header search, checklists, Harmonic Camp
// registers and Export/Import. Feature UIs live in the sibling modules imported below.
import { escapeHtml, isPlainObject } from '@atlas/core/util';
import { buildState, migrateLegacyState } from '@atlas/core/state';
import { validateState, describeErrors } from '@atlas/core/schema';
import { systemHaystack } from '@atlas/core/systems-model';
import { WikiSearch } from './wiki-data.js';
import { appState, setAppState, loadAppState, saveAppState, onSave, onStorageStatus } from './store.ts';
import { showToast } from './ui.js';
import { showSection, renderGuides, decorateBooks, onSection } from './nav.js';
import {
  renderSystems,
  renderOutlaw,
  renderSystemPanel,
  panelSystemId,
  panelMode,
  openSystem,
  openSystemEditor,
  starDot
} from './systems.js';
import { renderHome } from './companion.js';
import { registerServiceWorker } from './pwa.js';

registerServiceWorker();
import { loadGameData } from './calculators.js';

// =========================================================================
// 1. MASTER CHECKLIST DATA DEFINITIONS
// =========================================================================
const CHECKLIST_DATA = {
  // Ids match the named keys of nms_state.json → checklists
  milestones: [
    {
      id: 'crossSaveLinked',
      title: 'Cross-Save Linked',
      desc: 'PC, Mac, Switch & iOS share one Hello Games Cloud save.'
    },
    {
      id: 'anomalyUnlocked',
      title: 'Space Anomaly Unlocked',
      desc: 'Summoned the Anomaly and opened the Iteration vendors.'
    },
    { id: 'harmonicCampUnlocked', title: 'Harmonic Camp Unlocked', desc: 'Solved a Dissonant System register puzzle.' },
    { id: 'sClassInterceptorSecured', title: 'S-Class Interceptor Secured', desc: 'Ythgall claimed as flagship.' },
    { id: 'sentinelRifleSecured', title: 'Sentinel Rifle Secured', desc: 'Defiance of Thought claimed.' },
    {
      id: 'nutrientIngestorInstalled',
      title: 'Nutrient Ingestor Installed',
      desc: 'Required to eat Anomalous Doughnuts for the scanner buff.'
    },
    {
      id: 'anomalousDoughnutBatchCooked',
      title: 'Anomalous Doughnut Batch Cooked',
      desc: 'First batch ready for the fauna-scan Unit run.'
    },
    {
      id: 'capitalFreighterClaimed',
      title: 'Capital Freighter Claimed',
      desc: 'Won the second rescue battle for a free Capital Freighter.'
    },
    {
      id: 'oxygenAlchemyBaseBuilt',
      title: 'Oxygen Alchemy Base Built',
      desc: 'Oxygen hotspot feeding the refiner chamber (Book IV).'
    },
    {
      id: 'autophageUnlocked',
      title: 'Autophage Unlocked',
      desc: 'They Who Returned triggered after The Purge + Harmonic Camp.'
    }
  ],
  crosssave: [
    { id: 'cs1', title: 'Step 1: Log In to Hello Games Cloud', desc: 'Visit cloud.nomanssky.com and sign in.' },
    {
      id: 'cs2',
      title: 'Step 2: Link All Platform Accounts',
      desc: 'Connect Steam/Mac, Nintendo Switch, and Apple/iOS accounts.'
    },
    { id: 'cs3', title: 'Step 3: Enable Cross-Save Toggle', desc: 'Verify every connected platform is switched ON.' },
    {
      id: 'cs4',
      title: 'Step 4: Upload Primary Save Slot',
      desc: 'Click the Cloud Icon next to your main save slot in-game (max 5 slots).'
    },
    {
      id: 'cs5',
      title: 'Step 5: Verify Patch Parity Before Syncing',
      desc: 'Confirm version numbers match at the bottom-left of the title screen.'
    }
  ],
  roadmap: [
    {
      id: 'rm1',
      title: 'Hr 0–1: Planet Escape & Melee-Boost',
      desc: 'Gather Sodium/Oxygen; Sprint + Melee (Q/R) + Jetpack to fly 3x faster.'
    },
    {
      id: 'rm2',
      title: 'Hr 1–3: Rush the Space Anomaly',
      desc: 'Follow Awakenings until first warp jump and summon the Space Anomaly.'
    },
    {
      id: 'rm3',
      title: 'Hr 1–3: Unlock Nutrient Ingestor & Survey Device',
      desc: 'Purchase blueprints from Iteration: Selene & Eos on the Anomaly.'
    },
    {
      id: 'rm4',
      title: 'Ongoing: Double Exosuit Slots Per System',
      desc: 'Buy Slot #1 at the Space Station + Slot #2 inside the Space Anomaly.'
    },
    {
      id: 'rm5',
      title: 'Jump #5: Skip First System Freighter',
      desc: 'Avoid hitting friendly Freighter; answer radio (X); choose "Request Payment Instead".'
    },
    {
      id: 'rm6',
      title: 'Jump #10: Claim Free Capital Freighter',
      desc: 'Win second rescue battle (3 hrs + 5 warps) to claim a giant Capital Freighter 100% free.'
    },
    {
      id: 'rm7',
      title: 'Recovery: Strip & Scrap Aeron-ημ',
      desc: 'Store tech (X) on Aeron-ημ and scrap hull for ~50M Units + Storage Augmentations.'
    },
    {
      id: 'rm8',
      title: 'Meta Gear: Wire Ythgall & Light Capacitor',
      desc: 'Place Infra-Knife in Ythgall R2C2–R2C4; put Optical Drill in Light Capacitor R2C4.'
    }
  ],
  expedition: [
    {
      id: 'ex1',
      title: 'Pack 8 Tech Slots at Anomaly Terminus',
      desc: '3x S-Class Scanner Mods, 1x Optical Drill, 3x Movement Mods, 1x Personal Refiner Mk 2.'
    },
    {
      id: 'ex2',
      title: 'Pack Nanite Seed (For Cloning Ythgall)',
      desc: '2–3 stacks of 9,999 Runaway Mould OR 30 Unopened Suspicious Tech Packets (~6,000 Nanites).'
    },
    {
      id: 'ex3',
      title: 'Pack Unit Seed & Survival Stacks',
      desc: '10x Anomalous Doughnuts, 5x AI Valves, 9,999 Oxygen, Cond. Carbon, Ferrite, Batteries.'
    },
    {
      id: 'ex4',
      title: 'Equip Ythgall & Defiance of Thought Before Starting',
      desc: 'Ensure both are active so you can clone them inside the Expedition for ~5,000 Nanites.'
    },
    {
      id: 'ex5',
      title: 'Zero-Loss Extraction Before Clicking End',
      desc: 'Use "Return to Primary Save" to mule multiple batches; equip Reward Ship before ending!'
    }
  ],
  endgame: [
    {
      id: 'eg1',
      title: 'Pillar 1: Portal Mastery & Eissentam Reset',
      desc: 'Finish The Purge (16 Glyphs) and choose the Green Orb (equip junk ship/tool first).'
    },
    {
      id: 'eg2',
      title: 'Pillar 2: The Autophage Faction',
      desc: 'Complete The Purge + Unlock 1 Harmonic Camp + Warp to trigger They Who Returned.'
    },
    {
      id: 'eg3',
      title: 'Pillar 3: Purple Stars & Gas Giants',
      desc: 'Finish Atlas Path + Autophage to unlock the Atlantid Drive in In Stellar Multitudes.'
    },
    {
      id: 'eg4',
      title: 'Pillar 4: S-Class Pirate Dreadnought',
      desc: 'Blast 4 rear warp engines + 6 top deck laser cannons in Outlaw battle to force surrender.'
    },
    {
      id: 'eg5',
      title: 'Pillar 5: AI Minotaur & Laylaps Companion',
      desc: 'Claim a Planetary Settlement and complete A Trace of Metal.'
    },
    {
      id: 'eg6',
      title: 'Pillar 6: Custom S-Class Ship Foundry',
      desc: 'Salvage Cockpit, Wings & Thrusters and assemble with an S-Class Reactor Core.'
    },
    {
      id: 'eg7',
      title: 'Pillar 7: Starbirth (Void Egg Living Ship)',
      desc: 'Pulse in space with your Void Egg to complete the 5-day organic ship questline.'
    }
  ]
};

function renderAll() {
  renderAllChecklists();
  renderFleetCard();
  renderSystems();
  renderOutlaw();
  renderHome();
  // Re-rendering the panel replaces the notes textarea; never do that under someone's typing.
  if (panelSystemId && panelMode === 'view' && document.activeElement?.id !== 'systemNotes') renderSystemPanel();
  document.getElementById('currentPhaseText').textContent = appState.meta.currentPhase || '';
  document.getElementById('homePhase').textContent = appState.meta.currentPhase || '';
}

function renderFleetCard() {
  const { primaryStarship, salvageStarship, multiTools = [] } = appState.fleet;
  const row = (label, item, color) =>
    item
      ? `
        <div title="${escapeHtml(item.role || item.type)}"><span class="block text-[11px] text-slate-400">${label}</span><span class="block font-mono ${color} leading-snug">${escapeHtml(item.name)}${item.class ? ` <span class="text-slate-400">${escapeHtml(item.class)}</span>` : ''}</span></div>`
      : '';
  const toolColors = ['text-purple-300', 'text-cyan-300'];
  document.getElementById('fleetCardBody').innerHTML =
    row('Flagship', primaryStarship, 'text-white font-semibold') +
    row('Scrap Spare', salvageStarship, 'text-amber-300') +
    multiTools.map((tool, i) => row('Multi-Tool', tool, toolColors[i % toolColors.length])).join('');
}

// =========================================================================
// 3. GLOBAL SEARCH (navigation lives in assets/app/nav.js)
// =========================================================================
const SEARCH_WIKI_LIMIT = 6;
const SEARCH_BOOK_LIMIT = 6;
const SEARCH_SYSTEM_LIMIT = 5;
const SEARCH_BLOCKS = 'h3, h4, p, li, tr, [onclick^="toggleCheckItem"]';
let wikiEntries = [];
let searchHits = [];
let searchActiveIndex = -1;

function snippetAround(text, token, radius = 70) {
  const at = Math.max(0, text.toLowerCase().indexOf(token));
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + token.length + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

// Book text lives in the DOM, so search the smallest text blocks of every section (hidden ones included).
function findBookHits(tokens) {
  const hits = [];
  const seen = new Set();
  document.querySelectorAll('.book-section:not(#sec-systems):not(#sec-outlaw)').forEach(section => {
    const sectionTitle = section.querySelector('h2')?.textContent.trim() || section.id;
    section.querySelectorAll(SEARCH_BLOCKS).forEach(el => {
      if (el.querySelector(SEARCH_BLOCKS)) return; // prefer the innermost block
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      const lower = text.toLowerCase();
      if (!text || seen.has(lower) || !tokens.every(token => lower.includes(token))) return;
      seen.add(lower);
      const isHeading = /^H[34]$/.test(el.tagName);
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
// 4. CHECKLIST RENDERING ENGINE
// =========================================================================
function toggleCheckItem(id) {
  appState.checklists[id] = !appState.checklists[id];
  saveAppState();
}

function renderChecklistGroup(groupKey, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return 0;
  const list = CHECKLIST_DATA[groupKey] || [];
  let completed = 0;

  container.innerHTML = list
    .map(item => {
      const isDone = !!appState.checklists[item.id];
      if (isDone) completed++;
      return `
            <div onclick="toggleCheckItem('${item.id}')" class="cursor-pointer p-3 rounded-xl border text-xs flex items-start gap-3 transition ${isDone ? 'bg-cyan-950/30 border-cyan-500/40 text-slate-400 line-through' : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-200'}">
                <input type="checkbox" ${isDone ? 'checked' : ''} class="mt-0.5 pointer-events-none accent-cyan-400">
                <div>
                    <strong class="${isDone ? 'text-slate-400' : 'text-white'} block">${item.title}</strong>
                    <span class="text-slate-400">${item.desc}</span>
                </div>
            </div>
        `;
    })
    .join('');

  return completed;
}

function renderAllChecklists() {
  let done = 0;
  let total = 0;
  const perBook = {};
  Object.keys(CHECKLIST_DATA).forEach(key => {
    const groupDone = renderChecklistGroup(key, `checklist-${key}`);
    const groupTotal = CHECKLIST_DATA[key].length;
    total += groupTotal;
    done += groupDone;
    const book = document.getElementById(`checklist-${key}`)?.closest('.book-section')?.id.replace('sec-', '');
    if (!book) return;
    perBook[book] = perBook[book] || { done: 0, total: 0 };
    perBook[book].done += groupDone;
    perBook[book].total += groupTotal;
  });
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('guidesProgressText').textContent = `${done} of ${total} steps`;
  document.getElementById('guidesProgressBar').style.width = `${pct}%`;
  document.querySelectorAll('[data-guides-progress]').forEach(el => {
    el.textContent = `${pct}%`;
  });
  renderGuides(perBook);
}

// =========================================================================
// 5. LIVE GAMEPLAY CALCULATORS
// =========================================================================
function safeMathEval(expr) {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '');
    return Function(`"use strict"; return (${sanitized})`)();
  } catch {
    return '?';
  }
}

function runCalculators() {
  // Harmonic Camp registers; the data-driven calculators live in assets/app/calculators.js
  [1, 2, 3].forEach(n => {
    document.getElementById(`calcAns${n}`).textContent = safeMathEval(
      document.getElementById(`calcReg${n}`).value || '0'
    );
  });
}

// =========================================================================
// 6. JSON EXPORT / IMPORT FOR GIT REPO
// =========================================================================
function exportStateJSON() {
  const blob = new Blob([JSON.stringify(appState, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dlAnchor = document.createElement('a');
  dlAnchor.href = url;
  dlAnchor.download = 'nms_state.json';
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  URL.revokeObjectURL(url);
  showToast('Exported nms_state.json for your Git repo!');
}

// Nothing is replaced unless the whole file is valid; the message names the first problems so they can be fixed.
async function readStateFile(file) {
  if (!file) return;
  let imported;
  try {
    imported = JSON.parse(await file.text());
  } catch {
    showToast('That file isn’t valid JSON, so nothing was imported.');
    return;
  }
  const candidate = isPlainObject(imported) ? migrateLegacyState(imported) : imported;
  const { ok, errors } = validateState(candidate);
  if (!ok) {
    showToast(`Not imported: ${describeErrors(errors.slice(0, 2))}.`);
    return;
  }
  setAppState(buildState(candidate));
  saveAppState();
  showToast('Imported nms_state.json successfully!');
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
  readStateFile(event.target.files[0]);
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
  readStateFile(event.dataTransfer.files[0]);
}

onSave(renderAll);
onSection('calculators', loadGameData);
onSection('new-system', () => openSystemEditor());

(async function init() {
  decorateBooks();
  runCalculators();
  WikiSearch.load('wiki/').then(entries => {
    wikiEntries = entries;
    const current = entries.filter(entry => !WikiSearch.isOld(entry)).length;
    document.querySelectorAll('#sidebarWikiCount, [data-wiki-count]').forEach(el => {
      el.textContent = current.toLocaleString();
    });
  });
  await loadAppState();
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
  setDropzoneActive,
  toggleCheckItem,
  runCalculators
});
