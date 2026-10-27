// Section navigation (hash routes). Other modules react to a section opening through onSection(), which keeps this
// module free of imports from them.

const sectionHooks = {};
export function onSection(key, run) {
  sectionHooks[key] = run;
}

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

// Called from inline on…="" handlers in the markup and in rendered templates.
Object.assign(window, { showSection });
