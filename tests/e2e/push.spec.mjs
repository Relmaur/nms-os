// "Alerts when the app is asleep" (ADR-0006): the switch sends the relay only timer ids and end times, keeps the
// notification's words on the device for the service worker, and keeps the relay's schedule in step with the timers.
// The browser's push service is stubbed (Playwright blocks service workers here); the relay is answered by the test.
import { test, expect, sessionButton } from './fixtures.mjs';

const RELAY_PUSH = /^https:\/\/atlas-sync\.example\.workers\.dev\/v1\/push\//;
const SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/e2e',
  keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA', auth: 'tBHItJI5svbpez7KI4CCXg' }
};

test('the alerts switch keeps the relay’s schedule in step, with names kept on the device', async ({ page }) => {
  await page.addInitScript(subscription => {
    let subscribed = false;
    const made = () => ({ toJSON: () => subscription, unsubscribe: () => Promise.resolve(true) });
    const pushManager = {
      getSubscription: () => Promise.resolve(subscribed ? made() : null),
      subscribe: () => {
        subscribed = true;
        return Promise.resolve(made());
      }
    };
    const serviceWorker = {
      ready: Promise.resolve({ pushManager }),
      getRegistration: () => Promise.resolve(undefined),
      register: () => Promise.resolve({})
    };
    Object.defineProperty(Navigator.prototype, 'serviceWorker', { configurable: true, get: () => serviceWorker });
    // Headless Chromium reports notifications as denied even when granted.
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: Object.assign(function Notification() {}, {
        permission: 'granted',
        requestPermission: () => Promise.resolve('granted')
      })
    });
  }, SUBSCRIPTION);
  const calls = [];
  await page.route(RELAY_PUSH, route => {
    const request = route.request();
    calls.push({ method: request.method(), body: request.postDataJSON() });
    return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  });

  await page.goto('./');
  await sessionButton(page).click();
  const sheet = page.locator('#sessionSheet');
  const toggle = sheet.getByRole('switch', { name: 'Alerts when the app is asleep' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0]).toEqual({
    method: 'PUT',
    body: { subscription: SUBSCRIPTION, now: expect.any(Number), timers: [] }
  });

  await sheet.getByRole('button', { name: /Custom/ }).click();
  await sheet.getByLabel('Name').fill('Frigate back');
  await sheet.getByRole('button', { name: '15m' }).click();
  await sheet.getByRole('button', { name: /^Start timer/ }).click();
  await expect.poll(() => calls.length, { timeout: 10_000 }).toBe(2);
  const [scheduled] = calls[1].body.timers;
  expect(scheduled.id).toMatch(/^timer-/);
  expect(JSON.stringify(calls[1].body)).not.toContain('Frigate'); // the name never leaves the device
  // …but the service worker can find it for the notification.
  const note = await page.evaluate(
    id => caches.match(new URL(`timer-notes/${id}`, document.baseURI).href).then(r => r?.json()),
    scheduled.id
  );
  expect(note).toEqual({ title: 'Timer done: Frigate back', body: 'Tap to open ATLAS.' });

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => calls.map(call => call.method)).toEqual(['PUT', 'PUT', 'DELETE']);
});
