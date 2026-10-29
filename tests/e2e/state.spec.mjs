import fs from 'node:fs/promises';
import { test, expect, storedState, STORAGE_KEY } from './fixtures.mjs';

test('Export then Import round-trips the save', async ({ page }) => {
  await page.goto('./#more');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page
      .locator('#sec-more')
      .getByRole('button', { name: /Export nms_state\.json/ })
      .click()
  ]);
  expect(download.suggestedFilename()).toBe('nms_state.json');
  const file = await download.path();
  const exported = JSON.parse(await fs.readFile(file, 'utf8'));
  expect(exported.systems.map(system => system.name)).toContain('Ekwa Nexus');

  // Start from an empty browser copy (the repo's nms_state.json only), then import the export.
  await page.evaluate(key => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await expect(page.locator('#sec-more')).toBeVisible();
  expect((await storedState(page))?.systems?.some(system => system.name === 'Ekwa Nexus') ?? false).toBe(false);

  await page.locator('#sec-more input[type="file"]').setInputFiles(file);
  const dialog = page.getByRole('dialog', { name: 'Import this log?' });
  await expect(dialog).toContainText('3 systems'); // what the file holds, before anything changes
  expect((await storedState(page))?.systems?.some(system => system.name === 'Ekwa Nexus') ?? false).toBe(false);
  await dialog.getByRole('button', { name: 'Replace this device’s log' }).click();
  await expect(page.locator('#toastMessage')).toHaveText(/^Imported .+\. Undo it/);
  expect((await storedState(page)).systems.map(system => system.name)).toContain('Ekwa Nexus');

  // Undo puts back the log from before the import.
  await page
    .locator('#sec-more')
    .getByRole('button', { name: /Undo import/ })
    .click();
  await page
    .locator('#sec-more')
    .getByRole('button', { name: /Tap again to undo/ })
    .click();
  await expect(page.locator('#toastMessage')).toHaveText(/Import undone/);
  expect((await storedState(page)).systems.some(system => system.name === 'Ekwa Nexus')).toBe(false);
});

test('a file over 5 MB is refused before it is read', async ({ page }) => {
  await page.goto('./#more');
  await page.locator('#sec-more input[type="file"]').setInputFiles({
    name: 'huge.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 32)
  });
  await expect(page.locator('#toastMessage')).toHaveText(/over 5 MB/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('an old Logbook save migrates into Systems', async ({ page }) => {
  await page.addInitScript(key => {
    if (sessionStorage.getItem('atlas-test-legacy')) return;
    localStorage.setItem(
      key,
      JSON.stringify({
        meta: { lastUpdated: '2099-01-01T00:00:00.000Z' },
        logbook: [
          {
            id: 'log-1',
            system: 'Old Camp',
            type: 'Harmonic Camp',
            notes: 'Behind the ridge',
            glyphSolution: [4, 10, 16]
          }
        ]
      })
    );
    sessionStorage.setItem('atlas-test-legacy', '1');
  }, STORAGE_KEY);
  await page.goto('./#systems');
  await expect(page.locator('#systemList')).toContainText('Old Camp');
  // Migration runs in memory on every load; the stored copy drops the legacy key on the next save.
  await page.locator('#systemList').getByText('Old Camp').click();
  await page.getByRole('button', { name: 'Log a visit' }).click();
  await expect(page.locator('#toastMessage')).toHaveText('Logged a visit to Old Camp.');
  const state = await storedState(page);
  expect(state.logbook).toBeUndefined();
  const camp = state.systems.find(system => system.name === 'Old Camp');
  expect(camp.tags).toContain('harmonic-camp');
  expect(camp.notes).toBe('Behind the ridge\nHarmonic Camp solution: 4, 10, 16');
});
