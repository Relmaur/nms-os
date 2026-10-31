// The start-up screen is in each page's HTML, so it paints before any script runs. It leaves once the page has drawn.
export function endBoot(): void {
  const splash = document.getElementById('bootSplash');
  if (!splash) return;
  splash.classList.add('boot-done');
  setTimeout(() => {
    splash.remove();
  }, 250);
}
