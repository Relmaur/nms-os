// Registers the service worker (installable app + offline cache) for whichever page loads this file.
// Service workers need a secure context: HTTPS or localhost. On file:// or a plain-http LAN address
// `navigator.serviceWorker` is unavailable and the app simply runs online-only.
(function () {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const root = new URL('..', document.currentScript.src); // assets/pwa.js → app root
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('sw.js', root), { scope: root.pathname })
      .catch(err => console.warn('Service worker registration failed:', err));
  });
})();
