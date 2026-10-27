// Announces finished timers: a toast, a vibration and a system notification (allowed once, from the tap that adds a
// first timer). One timeout is armed for the next finish and re-armed after every change and whenever the app comes
// back. A web app can't wake itself without a push server, so a timer that finishes while the browser has suspended
// the page is announced as soon as you return. Nothing leaves the device.
import { dueForAlert, nextDue } from '@atlas/core/timers';
import { appState, isLoaded, subscribe } from '../../app/store.ts';
import { haptic, showToast } from '../../app/ui.ts';
import { markAlerted } from '../actions.ts';

const KIND_TITLE = { refine: 'Refiner done', crop: 'Ready to harvest', custom: 'Timer done' } as const;
let armed: ReturnType<typeof setTimeout> | undefined;
let armedFor: number | null = null;

function announce(): void {
  if (!isLoaded()) return;
  const due = dueForAlert(appState.timers, Date.now());
  if (!due.length) return;
  const marked = markAlerted(due.map(timer => timer.id));
  if (!marked.length) return;
  const first = marked[0];
  if (!first) return;
  const text =
    marked.length === 1 ? `${KIND_TITLE[first.kind]}: ${first.label}` : `${String(marked.length)} timers done`;
  showToast(`${text}.`);
  haptic([120, 80, 120]);
  void notify(text, marked.map(timer => timer.label).join(' · '), first.id);
}

async function notify(title: string, body: string, tag: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    // Through the service worker where there is one: Android only shows notifications that way.
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    const options = { body, tag, icon: 'assets/icons/icon-192.png' };
    if (registration) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch (error) {
    console.warn('[atlas]', { event: 'timer-notify-failed', reason: error instanceof Error ? error.name : 'unknown' });
  }
}

function arm(): void {
  announce();
  const next = nextDue(appState.timers);
  if (next === armedFor) return;
  clearTimeout(armed);
  armedFor = next;
  // At most a minute at a time: browser timeouts don't count a laptop's sleep, so a long wait could end that much
  // late; checking each minute catches up after waking.
  if (next !== null)
    armed = setTimeout(
      () => {
        armedFor = null; // always re-arm, even if this fired before the timer was due
        arm();
      },
      Math.min(Math.max(0, next - Date.now()) + 50, 60_000)
    );
}

// Asks once, from the tap that adds a timer (browsers only allow the prompt from a user action).
export function askToNotify(): void {
  if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
}

export function startTimerRunner(): void {
  subscribe(arm);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      armedFor = null; // timeouts may have been frozen with the page
      arm();
    }
  });
  arm();
}
