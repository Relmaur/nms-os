// Section navigation (hash routes), the Guides library and the book pager. Other modules react to a section
// opening through onSection(), which keeps this module free of imports from them.
import { escapeHtml } from '@atlas/core/util';

const sectionHooks = {};
export function onSection(key, run) {
  sectionHooks[key] = run;
}

// The six books live under Guides; everything else is a companion tool.
const BOOKS = [
  {
    key: 'book1',
    numeral: 'I',
    color: 'text-cyan-300',
    title: 'Cross-Save & First Hours',
    blurb: 'Cross-save setup, game modes and your first five hours'
  },
  {
    key: 'book2',
    numeral: 'II',
    color: 'text-emerald-300',
    title: 'Units & Nanites',
    blurb: 'The 4.29B Unit and Nanite wealth blueprint'
  },
  {
    key: 'book3',
    numeral: 'III',
    color: 'text-purple-300',
    title: 'Ship & Multi-Tool Meta',
    blurb: 'Supercharged slots, Ythgall, Defiance of Thought, Light Capacitor'
  },
  {
    key: 'book4',
    numeral: 'IV',
    color: 'text-amber-300',
    title: 'Self-Sufficient Base',
    blurb: 'Hotspots, farms and an automated, cozy base'
  },
  {
    key: 'book5',
    numeral: 'V',
    color: 'text-sky-300',
    title: 'Expeditions & Porting',
    blurb: 'Community expeditions and carrying items home'
  },
  {
    key: 'book6',
    numeral: 'VI',
    color: 'text-red-300',
    title: 'Endgame Pillars',
    blurb: 'Seven pillars of post-wealth progression'
  }
];
const TAB_FOR_SECTION = { home: 'home', systems: 'systems', outlaw: 'outlaw' }; // the rest live under More
let currentSection = null;

export function showSection(sectionKey) {
  if (sectionKey === 'wiki') {
    location.href = 'wiki/';
    return;
  } // the Codex is its own page
  if (sectionKey === 'logbook') sectionKey = 'systems'; // the Logbook was folded into Systems
  const newSystem = sectionKey === 'new-system'; // home-screen shortcut: log a system right away
  if (newSystem) sectionKey = 'home';
  if (!document.getElementById(`sec-${sectionKey}`)) sectionKey = 'home';
  const swap = () => {
    document.querySelectorAll('.book-section').forEach(sec => {
      sec.classList.toggle('hidden', sec.id !== `sec-${sectionKey}`);
    });
    window.scrollTo({ top: 0 });
  };
  const animate =
    currentSection &&
    currentSection !== sectionKey &&
    document.startViewTransition &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Switching again mid-animation skips the transition, which rejects its promises; the DOM still
  // updates, so the rejection is expected and must not surface as an uncaught error.
  if (animate) document.startViewTransition(swap).ready.catch(() => {});
  else swap();
  currentSection = sectionKey;

  const navKey = sectionKey.startsWith('book') ? 'guides' : sectionKey;
  document.querySelectorAll('.nav-btn[id^="nav-"]').forEach(btn => {
    if (btn.id === `nav-${navKey}`) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  const tab = TAB_FOR_SECTION[sectionKey] || 'more';
  document.querySelectorAll('#tabBar [data-tab]').forEach(item => {
    const active = item.dataset.tab === tab;
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
    const icon = item.querySelector('[data-icon]');
    icon.classList.toggle('ph-fill', active);
    icon.classList.toggle('ph-bold', !active);
  });
  if (location.hash !== `#${sectionKey}`) history.replaceState(null, '', `#${sectionKey}`);
  if (newSystem) sectionHooks['new-system']?.();
  sectionHooks[sectionKey]?.();
}

export function renderGuides(progress) {
  document.getElementById('guidesList').innerHTML = BOOKS.map(book => {
    const p = progress[book.key];
    return `
        <li><button onclick="showSection('${book.key}')" class="list-row">
            <span class="nav-tile ${book.color}">${book.numeral}</span>
            <span class="flex-1 min-w-0"><span class="block text-sm font-semibold text-white">${escapeHtml(book.title)}</span><span class="block text-xs text-slate-400">${escapeHtml(book.blurb)}</span></span>
            ${p ? `<span class="font-mono text-[11px] tabular-nums ${p.done === p.total ? 'text-emerald-300' : 'text-slate-400'}">${p.done}/${p.total}</span>` : ''}
            <i class="ph-bold ph-caret-right text-slate-500"></i>
        </button></li>`;
  }).join('');
}

// Each book gets a way back to Guides and to its neighbours.
export function decorateBooks() {
  BOOKS.forEach((book, i) => {
    const section = document.getElementById(`sec-${book.key}`);
    const prev = BOOKS[i - 1];
    const next = BOOKS[i + 1];
    section.insertAdjacentHTML(
      'afterbegin',
      `
            <button onclick="showSection('guides')" class="inline-flex items-center gap-1.5 h-9 -ml-1 px-1 text-sm font-medium text-cyan-300 hover:text-cyan-200"><i class="ph-bold ph-caret-left"></i>Guides</button>`
    );
    section.insertAdjacentHTML(
      'beforeend',
      `
            <nav aria-label="More guides" class="grid grid-cols-2 gap-3 pt-2">
                ${prev ? `<button onclick="showSection('${prev.key}')" class="book-pager text-left"><span class="text-xs text-slate-400 flex items-center gap-1"><i class="ph-bold ph-arrow-left"></i>Book ${prev.numeral}</span><span class="block text-sm text-white truncate">${escapeHtml(prev.title)}</span></button>` : '<span></span>'}
                ${next ? `<button onclick="showSection('${next.key}')" class="book-pager text-right"><span class="text-xs text-slate-400 flex items-center justify-end gap-1">Book ${next.numeral}<i class="ph-bold ph-arrow-right"></i></span><span class="block text-sm text-white truncate">${escapeHtml(next.title)}</span></button>` : ''}
            </nav>`
    );
  });
}

// Called from inline on…="" handlers in the markup and in rendered templates.
Object.assign(window, { showSection });
