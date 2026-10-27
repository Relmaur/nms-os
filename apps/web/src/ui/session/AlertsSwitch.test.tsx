import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { appState, setAppState } from '../../app/store.ts';
import { disablePush, sendSchedule, startPush } from '../../app/push.ts';
import { AlertsSwitch } from './AlertsSwitch.tsx';

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA', auth: 'tBHItJI5svbpez7KI4CCXg' }
};

let requests: { method: string; url: string; body: unknown }[];
let permission: NotificationPermission;
let subscribed: boolean;
const unsubscribe = vi.fn(() => Promise.resolve(true));

beforeEach(async () => {
  localStorage.clear();
  requests = [];
  permission = 'default';
  subscribed = false;
  const pushManager = {
    getSubscription: () => Promise.resolve(subscribed ? { toJSON: () => subscription, unsubscribe } : null),
    subscribe: () => {
      subscribed = true;
      return Promise.resolve({ toJSON: () => subscription, unsubscribe });
    }
  };
  vi.stubGlobal('PushManager', function PushManager() {});
  vi.stubGlobal('Notification', {
    get permission() {
      return permission;
    },
    requestPermission: () => Promise.resolve(permission === 'default' ? (permission = 'granted') : permission)
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager }) }
  });
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    requests.push({
      method: init.method ?? 'GET',
      url,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    });
    return Promise.resolve(new Response(null, { status: 204 }));
  });
  const state = buildState({ systems: [] });
  state.timers = [
    {
      id: 'timer-soon',
      kind: 'refine',
      label: '300 Chromatic Metal',
      startedAt: minutesFromNow(-1),
      endsAt: minutesFromNow(24),
      alerted: false
    },
    {
      id: 'timer-told',
      kind: 'custom',
      label: 'Old',
      startedAt: minutesFromNow(-9),
      endsAt: minutesFromNow(-2),
      alerted: true
    }
  ];
  act(() => {
    setAppState(state);
  });
  await disablePush(); // a clean switch for each test
  requests = [];
  startPush();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const toggle = () => screen.getByRole('switch', { name: 'Alerts when the app is asleep' });

test('turning alerts on asks for notifications and sends only ids and end times', async () => {
  render(<AlertsSwitch id="push" />);
  expect(toggle().getAttribute('aria-checked')).toBe('false');
  expect(screen.getByText(/timer names stay here/)).toBeTruthy();
  await userEvent.click(toggle());
  await expect.poll(() => requests.length).toBe(1);
  expect(permission).toBe('granted');
  expect(toggle().getAttribute('aria-checked')).toBe('true');
  const [put] = requests;
  expect(put?.method).toBe('PUT');
  expect(put?.url).toMatch(/\/v1\/push\/[A-Za-z0-9_-]{22}$/);
  expect(put?.body).toEqual({
    subscription,
    now: expect.any(Number) as number,
    timers: [{ id: 'timer-soon', at: Date.parse(appState.timers[0]!.endsAt) }]
  });
  expect(JSON.stringify(put?.body)).not.toContain('Chromatic'); // names stay on the device
});

test('an unchanged schedule isn’t sent again; turning alerts off removes the device', async () => {
  render(<AlertsSwitch id="push" />);
  await userEvent.click(toggle());
  await expect.poll(() => requests.length).toBe(1);
  await sendSchedule();
  expect(requests).toHaveLength(1);
  await userEvent.click(toggle());
  await expect.poll(() => requests.map(request => request.method)).toEqual(['PUT', 'DELETE']);
  expect(unsubscribe).toHaveBeenCalled();
  expect(toggle().getAttribute('aria-checked')).toBe('false');
  expect(localStorage.getItem('nms_master_os_push')).toBeNull();
});

test('a refused permission sends nothing and says where to allow it', async () => {
  permission = 'denied';
  render(<AlertsSwitch id="push" />);
  await userEvent.click(toggle());
  expect(await screen.findByText(/Notifications are off for this site/)).toBeTruthy();
  expect(toggle().getAttribute('aria-checked')).toBe('false');
  expect(requests).toEqual([]);
});

test('an iPhone browser tab is told to add the app to the Home Screen', () => {
  vi.stubGlobal('PushManager', undefined);
  // @ts-expect-error -- removed for this test: Safari tabs on iOS have no PushManager
  delete window.PushManager;
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
  startPush();
  render(<AlertsSwitch id="push" />);
  expect(screen.queryByRole('switch')).toBeNull();
  expect(screen.getByText(/add it to your Home Screen/)).toBeTruthy();
});
