// Failure modes, triggered deliberately: none of them may lose data silently (ADR-0002).
import { test, expect, storedState, STORAGE_KEY } from './fixtures.mjs';

test('a failed save shows a persistent banner offering an export', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    window.__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage is full', 'QuotaExceededError');
    };
  });
  await page.locator('#homeNow').getByRole('button', { name: 'Log visit' }).click();
  await expect(page.locator('#storageBanner')).toBeVisible();
  await expect(page.locator('#storageBannerText')).toContainText('Not saved on this device');
  await expect(page.locator('#storageBannerExport')).toBeVisible();

  // Once saving works again, the next save clears the banner.
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__setItem;
  });
  await page.locator('#homeNow').getByRole('button', { name: 'Log visit' }).click();
  await expect(page.locator('#storageBanner')).toBeHidden();
  const ekwa = (await storedState(page)).systems.find(system => system.id === 'sys-ekwa');
  expect(ekwa.visits).toHaveLength(3); // the visit logged while saving failed was kept in memory
});

for (const [label, raw] of [
  ['not JSON', '{"systems": [ broken'],
  ['the wrong shape', JSON.stringify({ systems: { not: 'a list' } })]
]) {
  test(`a stored copy that is ${label} is kept aside, not deleted`, async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        if (sessionStorage.getItem('atlas-test-corrupt')) return;
        localStorage.setItem(key, value);
        sessionStorage.setItem('atlas-test-corrupt', '1');
      },
      [STORAGE_KEY, raw]
    );
    await page.goto('./');
    await expect(page.locator('#storageBannerText')).toContainText('couldn’t be read');
    const kept = await page.evaluate(
      key =>
        Object.keys(localStorage)
          .filter(name => name.startsWith(`${key}.corrupt-`))
          .map(name => localStorage.getItem(name)),
      STORAGE_KEY
    );
    expect(kept).toEqual([raw]);
    await expect(page.locator('#homeNow')).toBeVisible(); // the app still starts, from the defaults
  });
}

test('a malformed import is rejected with the reason and changes nothing', async ({ page }) => {
  await page.goto('./#more');
  const input = page.locator('#sec-more input[type="file"]');
  await input.setInputFiles({
    name: 'nms_state.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ systems: [{ name: 42 }] }))
  });
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

test('a failed notes autosave says "Not saved" and raises the banner', async ({ page }) => {
  await page.goto('./#systems');
  await page.locator('#systemList').getByText('Ekwa Nexus').click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage) throw new DOMException('Storage is full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.locator('#systemNotes').fill('Notes that cannot be stored');
  await expect(page.locator('#notesStatus')).toHaveText('Not saved');
  await expect(page.locator('#storageBannerText')).toContainText('Not saved on this device');
});

test('an unreadable copy is never overwritten when there is no room to keep it aside', async ({ page }) => {
  const raw = '{"systems": [ broken';
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('atlas-test-full')) {
        localStorage.setItem(key, value);
        sessionStorage.setItem('atlas-test-full', '1');
      }
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, item) {
        if (this === localStorage) throw new DOMException('Storage is full', 'QuotaExceededError');
        return original.call(this, name, item);
      };
    },
    [STORAGE_KEY, raw]
  );
  await page.goto('./');
  await expect(page.locator('#storageBannerText')).toContainText('no room to keep a copy aside');
  await page
    .locator('#homeNow')
    .getByRole('button', { name: /Log visit|log a new system/ })
    .first()
    .click();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(raw);
});

test('a stored id crafted to inject script is refused, not run', async ({ page }) => {
  await page.addInitScript(key => {
    if (sessionStorage.getItem('atlas-test-xss')) return;
    localStorage.setItem(
      key,
      JSON.stringify({
        meta: { lastUpdated: '2099-01-01T00:00:00.000Z' },
        systems: [{ id: "x');window.__pwned=1;('", name: 'Evil' }]
      })
    );
    sessionStorage.setItem('atlas-test-xss', '1');
  }, STORAGE_KEY);
  await page.goto('./#systems');
  await expect(page.locator('#storageBannerText')).toContainText('couldn’t be read');
  await expect(page.locator('#systemList')).not.toContainText('Evil');
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test('notes being typed survive another tab’s save', async ({ page }) => {
  await page.goto('./#systems');
  await page.locator('#systemList').getByText('Ekwa Nexus').click();
  const other = await page.context().newPage();
  await other.goto('./');
  await page.locator('#systemNotes').fill('');
  await page.locator('#systemNotes').pressSequentially('Typed in tab A'); // the other tab saves within the 800 ms autosave delay
  await other.locator('#homeNow').getByRole('button', { name: 'Log visit' }).click();
  await expect(page.locator('#toastMessage')).toHaveText('Updated with changes from another tab.');
  await expect(page.locator('#systemNotes')).toHaveValue('Typed in tab A');
  const ekwa = (await storedState(page)).systems.find(system => system.id === 'sys-ekwa');
  expect(ekwa.notes).toBe('Typed in tab A');
  expect(ekwa.visits).toHaveLength(2); // the other tab's visit is kept too
  await other.close();
});

test('two tabs with the same notes open settle on the newest text', async ({ page }) => {
  await page.goto('./#systems');
  await page.locator('#systemList').getByText('Ekwa Nexus').click();
  await page.locator('#systemNotes').fill('A text');
  await expect(page.locator('#notesStatus')).toHaveText('Saved');
  await page.locator('#visitNote').click(); // tab A moves on; its notes panel stays open

  const other = await page.context().newPage();
  await other.goto('./#systems');
  await other.locator('#systemList').getByText('Ekwa Nexus').click();
  await page.evaluate(() => {
    window.__storageEvents = 0;
    addEventListener('storage', () => {
      window.__storageEvents += 1;
    });
  });
  await other.locator('#systemNotes').fill('B newer text');
  await expect(other.locator('#notesStatus')).toHaveText('Saved');
  await page.waitForTimeout(1500);

  expect(await page.evaluate(() => window.__storageEvents)).toBeLessThanOrEqual(2); // no write-back loop
  expect((await storedState(page)).systems.find(system => system.id === 'sys-ekwa').notes).toBe('B newer text');
  await expect(page.locator('#systemNotes')).toHaveValue('B newer text');
  await other.close();
});
