// Sync between two devices (two browser contexts) through a stand-in relay: the same versioned store the Worker
// keeps (apps/sync), held in memory by the test. The app seals every copy, so the relay only sees bytes.
import AxeBuilder from '@axe-core/playwright';
import { test, expect, seedState, storedState } from './fixtures.mjs';

const RELAY = /^https:\/\/atlas-sync\.example\.workers\.dev\/v1\/vaults\//;

function relay() {
  const vaults = new Map();
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'ETag',
    'Cache-Control': 'no-store'
  };
  const handler = async route => {
    const request = route.request();
    const id = new URL(request.url()).pathname.split('/').pop();
    const vault = vaults.get(id);
    const sealed = (current, status = 200) =>
      route.fulfill({ status, body: current.blob, headers: { ...cors, ETag: `"${current.version}"` } });
    switch (request.method()) {
      case 'OPTIONS':
        return route.fulfill({
          status: 204,
          headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, PUT, DELETE', 'Access-Control-Allow-Headers': '*' }
        });
      case 'GET':
        return vault ? sealed(vault) : route.fulfill({ status: 404, headers: cors });
      case 'DELETE':
        vaults.delete(id);
        return route.fulfill({ status: 204, headers: cors });
      case 'PUT': {
        const expected = Number(/\d+/.exec(request.headers()['if-match'])[0]);
        if ((vault?.version ?? 0) !== expected) return sealed(vault, 409);
        vaults.set(id, { version: expected + 1, blob: request.postDataBuffer() });
        return route.fulfill({ status: 200, body: JSON.stringify({ version: expected + 1 }), headers: cors });
      }
    }
  };
  return { vaults, handler };
}

const syncStatus = page => page.locator('#syncStatus');

test('two devices pair with the QR link, merge what each logged, and keep the code out of the address', async ({
  page,
  browser,
  baseURL
}) => {
  const { vaults, handler } = relay();
  await page.route(RELAY, handler);
  await page.goto('./#more');
  await page.getByRole('button', { name: 'Turn on sync' }).click();
  await expect(syncStatus(page)).toContainText('Synced just now');
  expect(vaults.size).toBe(1);
  const [vault] = vaults.values();
  expect(vault.blob.toString('latin1')).not.toContain('Ekwa'); // sealed before it left
  await page.getByRole('button', { name: 'Pair another device' }).click();
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
  const code = (await page.locator('#syncCodeCard .font-mono').textContent()).trim();

  // The second device: a log of its own, opened from the QR link.
  const phone = await browser.newContext({ baseURL });
  const other = await phone.newPage();
  await other.route(RELAY, handler);
  const own = seedState();
  own.systems = [{ id: 'sys-vy', name: 'Vy’keen Outpost', tags: [], planets: [], visits: [] }];
  await other.addInitScript(state => {
    if (!sessionStorage.getItem('seeded')) localStorage.setItem('nms_master_os_state', state);
    sessionStorage.setItem('seeded', '1');
  }, JSON.stringify(own));
  await other.goto(`./#pair=${code}`);
  await expect(other).toHaveURL(/#more$/); // the code never stays in the address or the history
  await other.getByRole('button', { name: 'Pair', exact: true }).click();
  await expect(syncStatus(other)).toContainText('Synced');
  const names = state => state.systems.map(system => system.name).sort();
  expect(names(await storedState(other))).toEqual(['Ekwa Nexus', 'Hesper Drift', 'Outlaw Den', 'Vy’keen Outpost']);

  // Each logs something; after syncing both have both.
  await other.goto('./#systems');
  await other.locator('#systemList').getByText('Ekwa Nexus').click();
  await other
    .getByRole('button', { name: /Log visit/ })
    .first()
    .click();
  await expect
    .poll(async () => (await storedState(other)).systems.find(s => s.id === 'sys-ekwa').visits.length)
    .toBe(2);
  await other.keyboard.press('Escape'); // close the system panel
  await other.goto('./#more');
  await other.getByRole('button', { name: 'Sync now' }).click();
  await expect(syncStatus(other)).toContainText('Synced');
  await page.goto('./#more');
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(syncStatus(page)).toContainText('Synced');
  await expect.poll(async () => names(await storedState(page))).toContain('Vy’keen Outpost');
  await expect
    .poll(async () => (await storedState(page)).systems.find(s => s.id === 'sys-ekwa').visits.length, {
      timeout: 10_000
    })
    .toBeGreaterThan(1);
  await phone.close();
});

test('offline, sync says the log is safe here and nothing else changes', async ({ page, context }) => {
  const { handler } = relay();
  await page.route(RELAY, handler);
  await page.goto('./#more');
  await page.getByRole('button', { name: 'Turn on sync' }).click();
  await expect(syncStatus(page)).toContainText('Synced');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(syncStatus(page)).toContainText('Offline. Changes stay on this device');
  expect((await storedState(page)).systems).toHaveLength(3);
});

test('axe: the Sync group with sync on and the code shown', async ({ page }) => {
  const { handler } = relay();
  await page.route(RELAY, handler);
  await page.goto('./#more');
  await page.getByRole('button', { name: 'Turn on sync' }).click();
  await expect(syncStatus(page)).toContainText('Synced');
  await page.getByRole('button', { name: 'Pair another device' }).click();
  await page.getByRole('button', { name: 'Delete cloud copy' }).click();
  const { violations } = await new AxeBuilder({ page }).include('#syncPanel').analyze();
  expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
});
