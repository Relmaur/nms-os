// Ready outlaw stations as badges outside the React screens: the home-screen icon, the Outlaw tab and the sidebar.
import { rankOutlaw } from '@atlas/core/systems-model';
import { appState } from './store.ts';

export function updateOutlawBadges() {
  const rows = rankOutlaw(appState.systems, appState.outlaw.restockHours);
  const readyCount = rows.filter(row => row.status.ready).length;
  document.getElementById('sidebarOutlawCount').textContent = rows.length ? `${readyCount}/${rows.length}` : '0';
  const badge = document.getElementById('tabOutlawBadge');
  badge.textContent = readyCount;
  badge.classList.toggle('hidden', !readyCount);
  if ('setAppBadge' in navigator)
    (readyCount ? navigator.setAppBadge(readyCount) : navigator.clearAppBadge()).catch(() => {});
}

// Coming back to the app (e.g. after an hour in-game): refresh the badges. The React screens refresh their own
// countdowns (src/ui/useNow.ts); keep-awake, install and storage live in src/ui/more/device-store.ts.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') updateOutlawBadges();
});

// Stations restock while the app sits open (keep-awake, mid-session): keep the badges in step with the screens' minute tick.
setInterval(updateOutlawBadges, 60000);
