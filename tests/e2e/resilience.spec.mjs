// Failure modes, triggered deliberately: none of them may lose data silently (ADR-0002).
import { test, expect, storedState, STORAGE_KEY } from './fixtures.mjs';

test('a failed save shows a persistent banner offering an export', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    window.__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('Storage is full', 'QuotaExceededError'); };
  });
  await page.locator('#homeNow').getByRole('button', { name: 'Log visit' }).click();
  await expect(page.locator('#storageBanner')).toBeVisible();
  await expect(page.locator('#storageBannerText')).toContainText('Not saved on this device');
  await expect(page.locator('#storageBannerExport')).toBeVisible();

  // Once saving works again, the next save clears the banner.
  await page.evaluate(() => { Storage.prototype.setItem = window.__setItem; });
  await page.locator('#homeNow').getByRole('button', { name: 'Log visit' }).click();
  await expect(page.locator('#storageBanner')).toBeHidden();
  const ekwa = (await storedState(page)).systems.find(system => system.id === 'sys-ekwa');
  expect(ekwa.visits).toHaveLength(3); // the visit logged while saving failed was kept in memory
});

for (const [label, raw] of [['not JSON', '{"systems": [ broken'], ['the wrong shape', JSON.stringify({ systems: { not: 'a list' } })]]) {
  test(`a stored copy that is ${label} is kept aside, not deleted`, async ({ page }) => {
    await page.addInitScript(([key, value]) => {
      if (sessionStorage.getItem('atlas-test-corrupt')) return;
      localStorage.setItem(key, value);
      sessionStorage.setItem('atlas-test-corrupt', '1');
    }, [STORAGE_KEY, raw]);
    await page.goto('./');
    await expect(page.locator('#storageBannerText')).toContainText('couldn’t be read');
    const kept = await page.evaluate(key => Object.keys(localStorage).filter(name => name.startsWith(`${key}.corrupt-`)).map(name => localStorage.getItem(name)), STORAGE_KEY);
    expect(kept).toEqual([raw]);
    await expect(page.locator('#homeNow')).toBeVisible(); // the app still starts, from the defaults
  });
}

test('a malformed import is rejected with the reason and changes nothing', async ({ page }) => {
  await page.goto('./#more');
  const input = page.locator('#sec-more input[type="file"]');
  await input.setInputFiles({ name: 'nms_state.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ systems: [{ name: 42 }] })) });
  await expect(page.locator('#toastMessage')).toHaveText('Not imported: systems[0].name must be text.');
  await input.setInputFiles({ name: 'nms_state.json', mimeType: 'application/json', buffer: Buffer.from('{ nope') });
  await expect(page.locator('#toastMessage')).toHaveText('That file isn’t valid JSON, so nothing was imported.');
  expect((await storedState(page)).systems.map(system => system.id)).toEqual(['sys-ekwa', 'sys-hesper', 'sys-den']);
});

test('a second tab picks up the first tab’s save instead of overwriting it', async ({ page }) => {
  await page.goto('./');
  const other = await page.context().newPage();
  await other.goto('./');
  await expect(other.locator('#homeNow')).toContainText('Ekwa Nexus');

  await page.locator('#homeNow').getByRole('button', { name: 'Log visit' }).click();
  await expect(other.locator('#toastMessage')).toHaveText('Updated with changes from another tab.');
  await other.locator('#homeNow').getByRole('button', { name: 'Log visit' }).click();

  const ekwa = (await storedState(page)).systems.find(system => system.id === 'sys-ekwa');
  expect(ekwa.visits).toHaveLength(3); // seeded + one per tab: neither tab wrote over the other
  await other.close();
});
