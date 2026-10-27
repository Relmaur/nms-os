// Registers the service worker (installable app + offline cache) for whichever page imports this module.
// Service workers need a secure context (HTTPS or localhost); elsewhere the app simply runs online-only.
// Built modules live in assets/, one level below the app root, which is the worker's scope.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const here = import.meta.url; // a variable, so Vite doesn't treat new URL(…, import.meta.url) as an asset import
  const root = new URL('../', here);
  addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('sw.js', root), { scope: root.pathname })
      .catch(err => console.warn('[atlas]', { event: 'sw-register-failed', reason: String(err?.name || err) }));
  });
}
