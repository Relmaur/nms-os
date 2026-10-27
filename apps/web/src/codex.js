// The Codex page (wiki/index.html): hash routing, faceted browse, quick look, article view and drafts of your own
// articles. Search and data loading are shared with the main app (lib/search.js, app/wiki-data.js).
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { WikiSearch } from './app/wiki-data.js';
import { registerServiceWorker } from './app/pwa.js';

registerServiceWorker();

const { CATEGORIES, SOURCES, escapeHtml } = WikiSearch;
const PAGE_SIZE = 20;
const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const DEFAULTS = { q: '', cat: 'all', src: 'all', letter: '', sort: 'relevance', old: '0', page: 1 };
const PERMALINK = (entry, revId) => `${entry.url}?oldid=${revId}`;

let entries = [];
let byPath = new Map();
let byTitle = new Map(); // lower-case title -> entry (current pages win)
let aliases = {}; // old item names the wiki redirects, e.g. "Rigogen" -> "Kelp Sac"
let usedIn = new Map(); // lower-case ingredient -> entries whose recipes use it
let verification = null; // wiki/verification.json from the last sync or verify
let state = { ...DEFAULTS };
let results = []; // current page's results, for keyboard + quick look
let selected = -1;
let peekIndex = -1;
let tocObserver = null;

// ---------------------------------------------------------------------
// Routing: #/?q=…&cat=…  (browse)   #/a/<path>?q=…  (article)
// ---------------------------------------------------------------------
function parseHash() {
  const [route, query = ''] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(query);
  const next = { ...DEFAULTS };
  Object.keys(DEFAULTS).forEach(key => {
    if (params.has(key)) next[key] = params.get(key);
  });
  next.page = Math.max(1, parseInt(next.page, 10) || 1);
  if (!(next.cat in CATEGORIES)) next.cat = 'all';
  if (!(next.src in SOURCES) || next.src === 'draft') next.src = 'all';
  if (next.old !== '1') next.old = '0';
  return route.startsWith('/a/')
    ? { view: 'article', path: decodeURIComponent(route.slice(3)), state: next }
    : { view: 'browse', state: next };
}

function queryString(s) {
  const params = new URLSearchParams();
  Object.entries(s).forEach(([key, value]) => {
    if (String(value) !== String(DEFAULTS[key])) params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function browseHref(s = state) {
  return `#/${queryString(s)}`;
}
function articleHref(path) {
  return `#/a/${encodeURIComponent(path)}${state.q ? `?q=${encodeURIComponent(state.q)}` : ''}`;
}

// Typing replaces history; filter clicks and opening articles push it, so Back works naturally.
function setParams(changes, { push = true } = {}) {
  const href = browseHref({ ...state, ...changes });
  if (push) location.hash = href;
  else {
    history.replaceState(null, '', href);
    route();
  }
}

function clearAll() {
  document.getElementById('codexSearch').value = '';
  location.hash = '#/';
}

function route() {
  const parsed = parseHash();
  state = parsed.state;
  const input = document.getElementById('codexSearch');
  if (document.activeElement !== input) input.value = state.q;
  closePeek();
  const isArticle = parsed.view === 'article';
  document.getElementById('browseView').classList.toggle('is-hidden', isArticle);
  document.getElementById('articleView').classList.toggle('is-hidden', !isArticle);
  if (isArticle) renderArticle(parsed.path);
  else renderBrowse();
}

// ---------------------------------------------------------------------
// Browse
// ---------------------------------------------------------------------
function count(list, key) {
  return list.reduce((acc, item) => {
    acc[item.entry[key]] = (acc[item.entry[key]] || 0) + 1;
    return acc;
  }, {});
}

function renderBrowse() {
  const includeOld = state.old === '1';
  const base = WikiSearch.search(entries, state.q, { includeOld });
  const srcMatch = r =>
    state.src === 'all' || r.entry.source === state.src || (state.src === 'custom' && r.entry.source === 'draft');
  const catMatch = r => state.cat === 'all' || r.entry.category === state.cat;
  const letterMatch = r => !state.letter || r.entry._letter === state.letter;

  const catCounts = count(
    base.filter(r => srcMatch(r) && letterMatch(r)),
    'category'
  );
  const srcCounts = count(
    base.filter(r => catMatch(r) && letterMatch(r)),
    'source'
  );
  srcCounts.custom = (srcCounts.custom || 0) + (srcCounts.draft || 0);
  const letterSet = new Set(base.filter(r => srcMatch(r) && catMatch(r)).map(r => r.entry._letter));
  let filtered = base.filter(r => srcMatch(r) && catMatch(r) && letterMatch(r));
  if (state.sort === 'az' && state.q)
    filtered = [...filtered].sort((a, b) => a.entry._title.localeCompare(b.entry._title));

  const oldCount = (includeOld ? base : WikiSearch.search(entries, state.q, { includeOld: true })).filter(
    r => WikiSearch.isOld(r.entry) && srcMatch(r) && catMatch(r) && letterMatch(r)
  ).length;
  renderFacets(catCounts, srcCounts, base.filter(r => srcMatch(r) && letterMatch(r)).length, oldCount);
  renderLetters(letterSet);

  const isLanding = !state.q && state.cat === 'all' && state.src === 'all' && !state.letter && !includeOld;
  if (!entries.length) {
    results = [];
    document.getElementById('resultsHeader').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';
    document.getElementById('browseBody').innerHTML = `
            <div class="rounded-2xl border border-dashed border-slate-700 p-8 text-center space-y-3">
                <i class="ph-duotone ph-books text-4xl text-emerald-300"></i>
                <h2 class="font-display font-bold text-lg text-white">The Codex is empty</h2>
                <p class="text-sm text-slate-300 max-w-md mx-auto">Run <code class="text-emerald-300">pnpm index:wiki</code> to index the committed archive (or <code class="text-emerald-300">pnpm sync:wiki</code> to refresh it from the wiki), then reload this page.</p>
            </div>`;
    return;
  }
  if (isLanding) return renderLanding();

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(state.page, pages);
  results = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  selected = -1;
  renderResultsHeader(filtered.length);
  renderResults();
  renderPagination(page, pages, filtered.length);
}

function renderFacets(catCounts, srcCounts, total, oldCount) {
  const facet = (label, icon, n, pressed, onclick) => `
        <button class="facet" aria-pressed="${pressed}" ${n ? '' : 'disabled'} onclick="${onclick}">
            <i class="ph-bold ${icon} text-base"></i><span class="truncate">${label}</span><span class="count">${n}</span>
        </button>`;
  document.getElementById('categoryFacets').innerHTML =
    facet('All categories', 'ph-squares-four', total, state.cat === 'all', "setParams({ cat: 'all', page: 1 })") +
    Object.entries(CATEGORIES)
      .map(([key, meta]) =>
        facet(meta.label, meta.icon, catCounts[key] || 0, state.cat === key, `setParams({ cat: '${key}', page: 1 })`)
      )
      .join('');

  const sourceOptions = [
    ['all', 'All sources', 'ph-stack'],
    ['wiki', 'Wiki pages', 'ph-globe'],
    ['custom', 'Your articles', 'ph-pencil-simple']
  ];
  const srcTotal = Object.entries(srcCounts)
    .filter(([key]) => key !== 'draft')
    .reduce((sum, [, n]) => sum + n, 0);
  document.getElementById('sourceFacets').innerHTML = sourceOptions
    .map(([key, label, icon]) =>
      facet(
        label,
        icon,
        key === 'all' ? srcTotal : srcCounts[key] || 0,
        state.src === key,
        `setParams({ src: '${key}', page: 1 })`
      )
    )
    .join('');

  const sorts = [
    ['relevance', 'Best match', 'ph-sparkle'],
    ['az', 'A–Z', 'ph-sort-ascending']
  ];
  document.getElementById('sortFacets').innerHTML = sorts
    .map(
      ([key, label, icon]) => `
        <button class="facet" aria-pressed="${state.sort === key}" onclick="setParams({ sort: '${key}', page: 1 })"><i class="ph-bold ${icon} text-base"></i><span>${label}</span></button>`
    )
    .join('');

  document.getElementById('categoryChips').innerHTML =
    `<button class="chip" aria-pressed="${state.cat === 'all'}" onclick="setParams({ cat: 'all', page: 1 })">All <span class="text-slate-400 font-mono text-xs">${total}</span></button>` +
    Object.entries(CATEGORIES)
      .map(
        ([key, meta]) =>
          `<button class="chip" aria-pressed="${state.cat === key}" onclick="setParams({ cat: '${key}', page: 1 })"><i class="ph-bold ${meta.icon}"></i>${meta.label} <span class="text-slate-400 font-mono text-xs">${catCounts[key] || 0}</span></button>`
      )
      .join('');
  const oldOn = state.old === '1';
  const oldToggle = `setParams({ old: '${oldOn ? '0' : '1'}', page: 1 })`;
  document.getElementById('oldFacet').innerHTML = `
        <button class="facet" aria-pressed="${oldOn}" onclick="${oldToggle}" title="Items the wiki marks obsolete, and pages since removed from the wiki">
            <i class="ph-bold ph-clock-counter-clockwise text-base"></i><span class="truncate">Include no longer in game</span><span class="count">${oldCount}</span>
        </button>`;
  document.getElementById('oldToggleMobile').innerHTML = `
        <button class="chip" aria-pressed="${oldOn}" onclick="${oldToggle}"><i class="ph-bold ph-clock-counter-clockwise"></i>Include no longer in game <span class="text-slate-400 font-mono text-xs">${oldCount}</span></button>`;
  document.getElementById('sourceSelect').innerHTML = sourceOptions
    .map(
      ([key, label]) =>
        `<option value="${key}" ${state.src === key ? 'selected' : ''}>${label} (${key === 'all' ? srcTotal : srcCounts[key] || 0})</option>`
    )
    .join('');
  document.getElementById('sortSelect').value = state.sort;
}

function renderLetters(available) {
  document.getElementById('letterBar').innerHTML =
    `<button class="letter px-2.5" aria-pressed="${!state.letter}" onclick="setParams({ letter: '', page: 1 })">All</button>` +
    LETTERS.map(
      letter =>
        `<button class="letter" aria-pressed="${state.letter === letter}" ${available.has(letter) ? '' : 'disabled'} onclick="setParams({ letter: '${letter}', page: 1 })" aria-label="Titles starting with ${letter === '#' ? 'a number or symbol' : letter}">${letter}</button>`
    ).join('');
}

function exampleTitles(category) {
  return entries
    .filter(entry => entry.category === category && !WikiSearch.isOld(entry))
    .sort((a, b) => a._title.localeCompare(b._title))
    .slice(0, 3);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// What the last sync or verify established about the archive.
function verificationPanel() {
  const v = verification;
  const tone = !v ? 'border-slate-700' : v.status === 'match' ? 'border-emerald-500/40' : 'border-amber-500/40';
  let icon = 'ph-question text-slate-400';
  let headline = 'Not verified on this copy';
  let detail = 'Run <code class="text-emerald-300">pnpm verify:wiki</code> to compare the archive with the live wiki.';
  if (v?.status === 'match') {
    icon = 'ph-seal-check text-emerald-300';
    headline = `Matches the wiki: ${v.matched.toLocaleString()} of ${v.pages.toLocaleString()} pages at their latest revision`;
    detail = `Checked ${formatDate(v.checkedAt)}, ${new Date(v.checkedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}. Wiki revisions never change once saved, so a matching revision id means an identical page.`;
  } else if (v?.status === 'differs') {
    icon = 'ph-warning text-amber-300';
    headline = `${(v.pages - v.matched).toLocaleString()} pages behind the wiki`;
    detail = `Checked ${formatDate(v.checkedAt)}. Run <code class="text-emerald-300">pnpm sync:wiki</code> to catch up.`;
  } else if (v?.status === 'unreachable') {
    icon = 'ph-cloud-slash text-amber-300';
    headline = 'The wiki couldn’t be reached at the last check';
    detail = `Tried ${formatDate(v.checkedAt)}. Showing the archived copy.`;
  } else if (v?.status === 'invalid-response') {
    icon = 'ph-warning text-amber-300';
    headline = 'The last check stopped on unexpected data from the wiki';
    detail = `Checked ${formatDate(v.checkedAt)}. Nothing was changed; showing the archived copy.`;
  }
  const scope = v?.pages
    ? `
        <ul class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-400">
            <li><strong class="text-slate-200 tabular-nums">${(v.obsolete || 0).toLocaleString()}</strong> obsolete items, hidden by default</li>
            <li><strong class="text-slate-200 tabular-nums">${(v.excluded || 0).toLocaleString()}</strong> player-found tools left out</li>
            <li><strong class="text-slate-200 tabular-nums">${(v.removed?.length || 0).toLocaleString()}</strong> pages since removed from the wiki</li>
        </ul>`
    : '';
  return `
        <div class="rounded-2xl bg-slate-900/60 border ${tone} p-4 sm:p-5">
            <div class="flex items-start gap-3">
                <i class="ph-fill ${icon} text-2xl shrink-0"></i>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-white">${headline}</p>
                    <p class="text-xs text-slate-400 mt-1 max-w-[70ch]">${detail}</p>
                </div>
            </div>
            ${scope}
        </div>`;
}

function renderLanding() {
  const current = entries.filter(entry => entry.source === 'wiki' && !WikiSearch.isOld(entry));
  results = [...current]
    .sort((a, b) => String(b.revTimestamp).localeCompare(String(a.revTimestamp)))
    .slice(0, 10)
    .map(entry => ({ entry, field: 'title' }));
  selected = -1;
  document.getElementById('pagination').innerHTML = '';
  document.getElementById('resultsHeader').innerHTML = `
        <div>
            <h1 class="font-display font-bold text-2xl sm:text-3xl text-white">Wiki Codex</h1>
            <p class="text-sm text-slate-300 mt-1">${current.length.toLocaleString()} game-data pages from the No Man’s Sky Wiki: items, technology, places, missions, galaxies and patch notes.</p>
        </div>`;
  const tiles = Object.entries(CATEGORIES)
    .map(([key, meta]) => {
      const n = current.filter(entry => entry.category === key).length;
      return `
        <a href="${browseHref({ ...DEFAULTS, cat: key })}" class="group block rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 p-4 transition">
            <div class="flex items-center gap-3">
                <span class="nav-tile text-emerald-300"><i class="ph-bold ${meta.icon}"></i></span>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-white">${meta.label}</p>
                    <p class="text-xs text-slate-400">${n.toLocaleString()} pages</p>
                </div>
                <i class="ph-bold ph-arrow-right ml-auto text-slate-500 group-hover:text-emerald-300 transition"></i>
            </div>
            <p class="text-xs text-slate-400 mt-3">${meta.blurb}</p>
            <p class="text-xs text-slate-300 mt-2 truncate">${exampleTitles(key)
              .map(entry => escapeHtml(entry.title))
              .join(' · ')}</p>
        </a>`;
    })
    .join('');
  const recent = results
    .map(
      (result, i) => `
        <li>
            <button data-i="${i}" onclick="peek(${i})" class="result w-full text-left" aria-selected="false">
                <span class="nav-tile text-cyan-300 mt-0.5"><i class="ph-bold ${CATEGORIES[result.entry.category]?.icon || 'ph-file-text'}"></i></span>
                <span class="min-w-0 flex-1">
                    <span class="flex items-center gap-2"><strong class="text-sm text-white truncate">${escapeHtml(result.entry.title)}</strong><span class="text-xs text-slate-400 shrink-0">${formatDate(result.entry.revTimestamp)}</span></span>
                    <span class="block text-xs text-slate-400 mt-0.5 line-clamp-2">${escapeHtml(result.entry.summary)}</span>
                </span>
            </button>
        </li>`
    )
    .join('');
  document.getElementById('browseBody').innerHTML = `
        <div class="space-y-10">
            ${verificationPanel()}
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">${tiles}</div>
            <div class="space-y-3">
                <h2 class="font-display font-bold text-base text-white">Recently edited on the wiki</h2>
                <ul class="grid grid-cols-1 xl:grid-cols-2 gap-1">${recent}</ul>
            </div>
        </div>`;
}

function renderResultsHeader(total) {
  const chips = [];
  if (state.q) chips.push(['q', `“${escapeHtml(state.q)}”`]);
  if (state.cat !== 'all') chips.push(['cat', CATEGORIES[state.cat].label]);
  if (state.src !== 'all') chips.push(['src', SOURCES[state.src].label]);
  if (state.letter) chips.push(['letter', `Starts with ${state.letter}`]);
  if (state.old === '1') chips.push(['old', 'Incl. no longer in game']);
  document.getElementById('resultsHeader').innerHTML = `
        <p class="text-sm text-slate-300"><strong class="text-white font-semibold tabular-nums">${total.toLocaleString()}</strong> ${total === 1 ? 'article' : 'articles'}</p>
        <div class="flex flex-wrap items-center gap-1.5">
            ${chips.map(([key, label]) => `<button onclick="${key === 'q' ? 'clearQuery()' : `setParams({ ${key}: DEFAULTS.${key}, page: 1 })`}" class="h-7 pl-2.5 pr-2 rounded-full bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-200 flex items-center gap-1.5">${label}<i class="ph-bold ph-x text-[10px] text-slate-400"></i></button>`).join('')}
            ${chips.length > 1 ? '<button onclick="clearAll()" class="h-7 px-2 text-xs text-emerald-300 hover:text-emerald-200">Clear all</button>' : ''}
        </div>`;
}

function renderResults() {
  const tokens = WikiSearch.tokenize(state.q);
  if (!results.length) {
    document.getElementById('browseBody').innerHTML = `
            <div class="rounded-2xl border border-dashed border-slate-700 p-8 text-center space-y-2">
                <p class="text-white font-semibold">No articles match.</p>
                <p class="text-sm text-slate-400">Try fewer words, another spelling, or clear a filter.</p>
            </div>`;
    return;
  }
  const fieldLabel = { title: '', summary: 'in summary', text: 'in article text' };
  document.getElementById('browseBody').innerHTML =
    `<ul class="space-y-1" role="listbox" aria-label="Articles">${results
      .map((result, i) => {
        const entry = result.entry;
        const snippet = tokens.length && result.field !== 'title' ? WikiSearch.snippet(entry, tokens) : entry.summary;
        return `
        <li class="result group" data-i="${i}" role="option" aria-selected="false">
            <button onclick="peek(${i})" class="min-w-0 flex-1 flex gap-3 items-start text-left" aria-label="Quick look: ${escapeHtml(entry.title)}">
                <span class="nav-tile ${entry.source === 'wiki' ? 'text-cyan-300' : 'text-amber-300'} mt-0.5"><i class="ph-bold ${CATEGORIES[entry.category]?.icon || 'ph-file-text'}"></i></span>
                <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <strong class="text-[0.9375rem] text-white">${WikiSearch.highlight(entry.title, tokens)}</strong>
                        ${WikiSearch.badge(entry.source)}${WikiSearch.statusBadge(entry)}
                        <span class="text-xs text-slate-400">${CATEGORIES[entry.category]?.label || entry.category}${tokens.length && fieldLabel[result.field] ? ` · ${fieldLabel[result.field]}` : ''}</span>
                    </span>
                    <span class="block text-[0.8125rem] leading-relaxed text-slate-300 mt-1 line-clamp-2">${WikiSearch.highlight(snippet || '', tokens)}</span>
                </span>
            </button>
            <a href="${articleHref(entry.path)}" class="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition" aria-label="Open ${escapeHtml(entry.title)}" title="Open article"><i class="ph-bold ph-arrow-right"></i></a>
        </li>`;
      })
      .join('')}</ul>`;
}

function renderPagination(page, pages, total) {
  const nav = document.getElementById('pagination');
  if (pages <= 1) {
    nav.innerHTML = '';
    return;
  }
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const button = (label, target, disabled) =>
    `<button ${disabled ? 'disabled' : ''} onclick="setParams({ page: ${target} }); window.scrollTo({ top: 0 })" class="h-10 px-4 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2">${label}</button>`;
  nav.innerHTML = `
        ${button('<i class="ph-bold ph-arrow-left"></i><span class="hidden sm:inline">Previous</span>', page - 1, page === 1)}
        <span class="text-xs text-slate-400 tabular-nums">${from}–${to} of ${total.toLocaleString()} · page ${page}/${pages}</span>
        ${button('<span class="hidden sm:inline">Next</span><i class="ph-bold ph-arrow-right"></i>', page + 1, page === pages)}`;
}

// ---------------------------------------------------------------------
// Search input & keyboard
// ---------------------------------------------------------------------
let searchTimer;
function onSearchInput(value) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (parseHash().view === 'article') location.hash = browseHref({ ...DEFAULTS, q: value });
    else setParams({ q: value, page: 1 }, { push: false });
  }, 80);
}

function clearQuery() {
  document.getElementById('codexSearch').value = '';
  setParams({ q: '', page: 1 });
}

function onSearchKey(event) {
  if (event.key === 'ArrowDown' && results.length) {
    event.preventDefault();
    event.target.blur();
    select(0);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    clearTimeout(searchTimer);
    setParams({ q: event.target.value, page: 1 }, { push: false });
    if (results.length) {
      event.target.blur();
      select(0);
    }
  } else if (event.key === 'Escape') {
    event.target.blur();
  }
}

function select(i) {
  if (!results.length) return;
  selected = Math.max(0, Math.min(results.length - 1, i));
  document
    .querySelectorAll('#browseBody [data-i]')
    .forEach(el => el.setAttribute('aria-selected', String(Number(el.dataset.i) === selected)));
  document.querySelector(`#browseBody [data-i="${selected}"]`)?.scrollIntoView({ block: 'nearest' });
  if (peekIndex !== -1) peek(selected);
}

document.addEventListener('keydown', event => {
  const modalOpen = !document.getElementById('createModal').classList.contains('hidden');
  if (event.key === 'Escape') {
    if (modalOpen) return closeCreateModal();
    if (peekIndex !== -1) return closePeek();
  }
  if (modalOpen) return;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if (typing) return;
  if (event.key === '/' || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) {
    event.preventDefault();
    document.getElementById('codexSearch').focus();
    return;
  }
  if (document.getElementById('browseView').classList.contains('is-hidden') || !results.length) return;
  if (event.key === 'ArrowDown' || event.key === 'j') {
    event.preventDefault();
    select(selected + 1);
  } else if (event.key === 'ArrowUp' || event.key === 'k') {
    event.preventDefault();
    select(selected - 1);
  } else if (event.key === ' ' && selected !== -1) {
    event.preventDefault();
    peekIndex === -1 ? peek(selected) : closePeek();
  } else if (event.key === 'Enter' && selected !== -1) {
    event.preventDefault();
    location.hash = articleHref(results[selected].entry.path);
  }
});

// ---------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') || '')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function findByTitle(title) {
  const lower = title.trim().toLowerCase();
  const alias = Object.keys(aliases).find(key => key.toLowerCase() === lower);
  return byTitle.get(lower) || (alias ? byTitle.get(aliases[alias].toLowerCase()) : undefined);
}

// [[Target]], [[Target|label]], and [[Target\|label]] inside Markdown table cells.
const WIKI_LINK = /\[\[([^\]]+?)\]\]/g;
function splitLink(inner) {
  const [target, ...label] = inner.split(/\\?\|/);
  return { target: target.trim(), label: (label.join('|') || target).trim() };
}

function renderMarkdown(markdown) {
  const body = markdown.replace(/^\s*#\s+[^\n]*\n*/, ''); // the page header already shows the title
  const linked = body.replace(WIKI_LINK, (_, inner) => {
    const { target, label } = splitLink(inner);
    const entry = findByTitle(target);
    return entry ? `[${label}](${articleHref(entry.path)})` : label;
  });
  return DOMPurify.sanitize(marked.parse(linked));
}

// ---------------------------------------------------------------------
// Quick look
// ---------------------------------------------------------------------
function peek(i) {
  const result = results[i];
  if (!result) return;
  const entry = result.entry;
  peekIndex = i;
  selected = i;
  document
    .querySelectorAll('#browseBody [data-i]')
    .forEach(el => el.setAttribute('aria-selected', String(Number(el.dataset.i) === i)));
  document.getElementById('peekMeta').innerHTML =
    `${WikiSearch.badge(entry.source)}${WikiSearch.statusBadge(entry)}<span>${CATEGORIES[entry.category]?.label || entry.category}</span>`;
  document.getElementById('peekTitle').textContent = entry.title;
  document.getElementById('peekOpen').href = articleHref(entry.path);
  const body = document.getElementById('peekBody');
  body.innerHTML = renderMarkdown(entry.body || `# ${entry.title}\n\n${entry.summary || ''}`);
  body.scrollTop = 0;
  const panel = document.getElementById('peekPanel');
  panel.classList.remove('translate-y-full', 'md:translate-x-full');
  const backdrop = document.getElementById('peekBackdrop');
  backdrop.classList.remove('opacity-0', 'pointer-events-none');
  document.body.classList.toggle('overflow-hidden', window.innerWidth < 768);
}

function closePeek() {
  if (peekIndex === -1) return;
  peekIndex = -1;
  document.getElementById('peekPanel').classList.add('translate-y-full', 'md:translate-x-full');
  const backdrop = document.getElementById('peekBackdrop');
  backdrop.classList.add('opacity-0', 'pointer-events-none');
  document.body.classList.remove('overflow-hidden');
}

// ---------------------------------------------------------------------
// Article
// ---------------------------------------------------------------------
function slugId(text) {
  return `h-${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function railList(title, items) {
  if (!items.length) return '';
  return `
        <div>
            <p class="nav-group-label !px-0">${title}</p>
            <ul class="space-y-1">${items
              .map(
                entry => `
                <li><a href="${articleHref(entry.path)}" class="flex items-center gap-2 py-1 text-sm text-slate-300 hover:text-white"><i class="ph-bold ${CATEGORIES[entry.category]?.icon || 'ph-file-text'} text-slate-500 shrink-0"></i><span class="truncate">${escapeHtml(entry.title)}</span></a></li>`
              )
              .join('')}
            </ul>
        </div>`;
}

function renderArticle(path) {
  const entry = byPath.get(path);
  const header = document.getElementById('articleHeader');
  const bodyEl = document.getElementById('articleBody');
  const rail = document.getElementById('articleRail');
  const crumbs = document.getElementById('articleCrumbs');
  const back = state.q
    ? `<a href="${browseHref({ ...DEFAULTS, q: state.q })}" class="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 mr-2"><i class="ph-bold ph-arrow-left"></i>Results for “${escapeHtml(state.q)}”</a>`
    : '';
  if (!entry) {
    crumbs.innerHTML = back;
    header.innerHTML = '<h1 class="font-display font-bold text-2xl text-white">Article not found</h1>';
    bodyEl.innerHTML = `<p>No article at <code>${escapeHtml(path)}</code>. It may have been renamed by a re-sync. <a href="#/">Back to the Codex</a>.</p>`;
    rail.innerHTML = '';
    return;
  }
  const category = CATEGORIES[entry.category];
  crumbs.innerHTML = `${back}<a href="#/" class="hover:text-white">Codex</a><i class="ph-bold ph-caret-right text-[10px]"></i><a href="${browseHref({ ...DEFAULTS, cat: entry.category })}" class="hover:text-white">${category?.label || entry.category}</a><i class="ph-bold ph-caret-right text-[10px]"></i><span class="text-slate-300 truncate max-w-[50vw]">${escapeHtml(entry.title)}</span>`;
  header.innerHTML = `
        <div class="flex flex-wrap items-center gap-2 text-xs text-slate-400">${WikiSearch.badge(entry.source)}${WikiSearch.statusBadge(entry)}<span>${category?.label || entry.category}</span></div>
        <h1 class="font-display font-bold text-3xl sm:text-4xl text-white leading-tight text-balance">${escapeHtml(entry.title)}</h1>
        ${entry.summary ? `<p class="text-base text-slate-300 leading-relaxed">${escapeHtml(entry.summary)}</p>` : ''}
        ${entry.removed ? '<p class="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">This page has been removed from the wiki. You’re reading the last archived copy.</p>' : ''}
        ${entry.obsolete && !entry.removed ? '<p class="rounded-xl border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">No longer in the game: the wiki keeps this page for an older version.</p>' : ''}
        ${entry.revId ? `<p class="text-xs text-slate-400 leading-relaxed">Wiki revision <a href="${escapeHtml(PERMALINK(entry, entry.revId))}" target="_blank" rel="noopener noreferrer" class="font-mono text-cyan-300 hover:text-cyan-200 underline underline-offset-2">${entry.revId}</a>, edited ${formatDate(entry.revTimestamp)}${entry.version ? ` · the wiki marks it up to date as of the <strong class="text-slate-200 font-medium">${escapeHtml(entry.version)}</strong> update` : ''}.</p>` : ''}
        <div class="flex flex-wrap items-center gap-2">
            <button onclick="copyLink()" class="h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-200 flex items-center gap-2"><i class="ph-bold ph-link"></i>Copy link</button>
            ${entry.url ? `<a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer" class="h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-200 flex items-center gap-2"><i class="ph-bold ph-arrow-square-out"></i>Live wiki page</a>` : ''}
            ${entry.source === 'draft' ? `<button data-path="${escapeHtml(entry.path)}" onclick="removeDraft(this.dataset.path)" class="h-9 px-3 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs flex items-center gap-2"><i class="ph-bold ph-trash"></i>Remove draft</button>` : ''}
        </div>`;
  bodyEl.innerHTML = renderMarkdown(entry.body || '');
  if (entry.url)
    bodyEl.insertAdjacentHTML(
      'beforeend',
      `<p class="text-xs text-slate-400 pt-6 border-t border-slate-800 mt-10">Source: <a href="${escapeHtml(PERMALINK(entry, entry.revId))}" target="_blank" rel="noopener noreferrer">No Man's Sky Wiki, revision ${entry.revId}</a> · CC BY-SA 3.0 · rendered from the page source</p>`
    );

  // Table of contents
  const headings = [...bodyEl.querySelectorAll('h2, h3')];
  const used = new Set();
  headings.forEach(h => {
    let id = slugId(h.textContent);
    while (used.has(id)) id += '-x';
    used.add(id);
    h.id = id;
  });
  const toc =
    headings.length > 1
      ? `
        <div>
            <p class="nav-group-label !px-0">On this page</p>
            <nav class="space-y-0.5">${headings.map(h => `<button class="toc-link" data-depth="${h.tagName[1]}" data-target="${h.id}" onclick="document.getElementById(this.dataset.target).scrollIntoView({ behavior: 'smooth' })">${escapeHtml(h.textContent)}</button>`).join('')}</nav>
        </div>`
      : '';

  // Outgoing [[links]], backlinks ("Mentioned in") and neighbours in the same category
  const outgoing = [
    ...new Set([...(entry.body || '').matchAll(WIKI_LINK)].map(match => splitLink(match[1]).target.toLowerCase()))
  ]
    .map(findByTitle)
    .filter(entry => entry && !WikiSearch.isOld(entry))
    .filter((other, i, list) => other !== entry && list.indexOf(other) === i);
  const usedBy = (usedIn.get(entry._title) || [])
    .filter(other => other !== entry && !WikiSearch.isOld(other))
    .sort((a, b) => a._title.localeCompare(b._title));
  const mentionedIn =
    entry._title.length >= 4
      ? entries
          .filter(
            other =>
              other !== entry &&
              other._title !== entry._title &&
              !WikiSearch.isOld(other) &&
              other._body.includes(entry._title)
          )
          .sort((a, b) => a._title.localeCompare(b._title))
          .slice(0, 8)
      : [];
  const siblings = entries
    .filter(other => other.category === entry.category && (other === entry || !WikiSearch.isOld(other)))
    .sort((a, b) => a._title.localeCompare(b._title));
  const at = siblings.indexOf(entry);
  const nearby = siblings
    .slice(Math.max(0, at - 2), at + 4)
    .filter(other => other !== entry)
    .slice(0, 5);

  rail.innerHTML =
    toc +
    railList('Used in', usedBy.slice(0, 12)) +
    railList('Links to', outgoing.slice(0, 12)) +
    railList('Mentioned in', mentionedIn) +
    railList(`More in ${category?.label || entry.category}`, nearby);

  if (tocObserver) tocObserver.disconnect();
  if (headings.length > 1) {
    tocObserver = new IntersectionObserver(
      observed => {
        observed.forEach(item => {
          if (!item.isIntersecting) return;
          rail
            .querySelectorAll('.toc-link')
            .forEach(link => link.classList.toggle('is-active', link.dataset.target === item.target.id));
        });
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );
    headings.forEach(h => tocObserver.observe(h));
  }
  document.title = `${entry.title} · Wiki Codex`;
  window.scrollTo({ top: 0 });
}

function copyLink() {
  const url = location.href;
  (navigator.clipboard?.writeText(url) || Promise.reject())
    .then(() => showToast('Link copied.'))
    .catch(() => showToast(url));
}

// ---------------------------------------------------------------------
// New article (draft + .md download)
// ---------------------------------------------------------------------
function openCreateModal() {
  const select = document.getElementById('newCategory');
  if (!select.options.length)
    select.innerHTML = Object.entries(CATEGORIES)
      .map(([key, meta]) => `<option value="${key}">${meta.label}</option>`)
      .join('');
  if (state.cat in CATEGORIES) select.value = state.cat;
  const modal = document.getElementById('createModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  renderCreatePreview();
  document.getElementById('newTitle').focus();
}

function closeCreateModal() {
  const modal = document.getElementById('createModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function renderCreatePreview() {
  const title = document.getElementById('newTitle').value.trim() || 'Untitled article';
  document.getElementById('newPreview').innerHTML =
    `<h1>${escapeHtml(title)}</h1>` + renderMarkdown(document.getElementById('newBody').value);
}

async function saveDraft() {
  const title = document.getElementById('newTitle').value.trim();
  const category = document.getElementById('newCategory').value;
  const body = document.getElementById('newBody').value.trim();
  const slug = WikiSearch.slugify(title);
  if (!slug || !body) {
    showToast('Add a title (letters or numbers) and some Markdown first.');
    return;
  }
  const summary =
    document.getElementById('newSummary').value.trim() ||
    body
      .replace(/[#*_`>[\]|-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
  const path = `wiki/custom/${category}/${slug}.md`;
  const markdown = `# ${title}\n\n${body}\n`;
  // Frontmatter format matches what scripts/sync-wiki.mjs writes and parses.
  const fileText = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `category: ${JSON.stringify(category)}`,
    `summary: ${JSON.stringify(summary)}`,
    'source: "custom"',
    `updated: ${JSON.stringify(new Date().toISOString().slice(0, 10))}`,
    '---',
    '',
    markdown
  ].join('\n');

  const url = URL.createObjectURL(new Blob([fileText], { type: 'text/markdown' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slug}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  WikiSearch.writeDrafts([
    { title, slug, category, path, summary, body: markdown },
    ...WikiSearch.readDrafts().filter(draft => draft.path !== path)
  ]);
  closeCreateModal();
  ['newTitle', 'newSummary', 'newBody'].forEach(id => {
    document.getElementById(id).value = '';
  });
  await loadEntries();
  location.hash = `#/a/${encodeURIComponent(path)}`;
  showToast(`Downloaded ${slug}.md. Move it into wiki/custom/${category}/ and run pnpm index:wiki.`);
}

async function removeDraft(path) {
  WikiSearch.writeDrafts(WikiSearch.readDrafts().filter(draft => draft.path !== path));
  await loadEntries();
  location.hash = '#/';
  showToast('Draft removed.');
}

function showToast(message) {
  const banner = document.getElementById('toastBanner');
  document.getElementById('toastMessage').textContent = message;
  banner.classList.remove('hidden');
  banner.classList.add('flex');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    banner.classList.add('hidden');
    banner.classList.remove('flex');
  }, 3500);
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------
async function loadEntries() {
  entries = await WikiSearch.load('./', { withBodies: true });
  aliases = window.WIKI_OFFLINE_BUNDLE?.aliases || {};
  byPath = new Map(entries.map(entry => [entry.path, entry]));
  byTitle = new Map();
  [...entries]
    .sort((a, b) => WikiSearch.isOld(a) - WikiSearch.isOld(b))
    .forEach(entry => {
      if (!byTitle.has(entry._title)) byTitle.set(entry._title, entry);
    });
  // Recipe inputs -> the items they go into (crafting, refining, cooking).
  usedIn = new Map();
  entries.forEach(entry =>
    (entry.recipes || []).forEach(recipe => {
      if (!['craft', 'refine', 'cook'].includes(recipe.type) || recipe.obsolete) return;
      recipe.inputs.forEach(input => {
        const target = findByTitle(String(input.name));
        const key = target ? target._title : String(input.name).toLowerCase();
        const list = usedIn.get(key) || [];
        if (!list.includes(entry)) list.push(entry);
        usedIn.set(key, list);
      });
    })
  );
}

async function loadVerification() {
  try {
    const res = await fetch('verification.json', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    verification = res.ok ? await res.json() : null;
  } catch {
    verification = null;
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768 && peekIndex === -1) document.body.classList.remove('overflow-hidden');
});

(async () => {
  document.getElementById('browseBody').innerHTML = '<p class="text-sm text-slate-400 py-8">Loading the Codex…</p>';
  await Promise.all([loadEntries(), loadVerification()]);
  route();
})();

// Called from inline on…="" handlers in the markup and in rendered templates (DEFAULTS is read by the chip handlers).
Object.assign(window, {
  setParams,
  clearAll,
  clearQuery,
  peek,
  closePeek,
  copyLink,
  onSearchInput,
  onSearchKey,
  openCreateModal,
  closeCreateModal,
  renderCreatePreview,
  saveDraft,
  removeDraft,
  DEFAULTS
});
