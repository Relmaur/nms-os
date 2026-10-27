import { test, expect, storedState } from './fixtures.mjs';

test('adds a system with glyphs and a tag, logging the arrival', async ({ page }) => {
  await page.goto('./#systems');
  await page.locator('#sec-systems').getByRole('button', { name: 'Add system' }).click();
  await page.locator('#sysName').fill('Test Prime');
  await page.locator('#systemEditor input[name="glyphs"]').fill('1a2b3c4d5e6f');
  await page.locator('#tagInput').fill('mining');
  await page.locator('#tagInput').press('Enter');
  await page.locator('#systemEditor button[type="submit"]').click();

  await expect(page.locator('#systemList')).toContainText('Test Prime');
  const system = (await storedState(page)).systems.find(item => item.name === 'Test Prime');
  expect(system.glyphs).toBe('1A2B3C4D5E6F');
  expect(system.tags).toContain('mining');
  expect(system.visits).toHaveLength(1);
});

test('notes autosave and planets persist across a reload', async ({ page }) => {
  await page.goto('./#systems');
  await page.locator('#systemList').getByText('Ekwa Nexus').click();
  await expect(page.locator('#systemPanelTitle')).toHaveText('Ekwa Nexus');

  await page.locator('#systemNotes').fill('Best trade route starts here');
  await page.getByRole('button', { name: 'Add planet' }).click();
  await page.locator('#systemPanelBody form input[name="name"]').fill('Verdant IV');
  await page.locator('#systemPanelBody form').getByRole('button', { name: 'Add planet' }).click();
  await expect(page.locator('#systemPanelBody')).toContainText('Verdant IV');

  await page.keyboard.press('Escape'); // closing the panel flushes the notes
  await page.reload();
  const system = (await storedState(page)).systems.find(item => item.id === 'sys-ekwa');
  expect(system.notes).toBe('Best trade route starts here');
  expect(system.planets.map(planet => planet.name)).toEqual(['Verdant IV']);
});

test('the Favourites filter shows only favourite systems', async ({ page }) => {
  await page.goto('./#systems');
  await page.locator('#systemList').getByText('Hesper Drift').click();
  await page.getByRole('button', { name: 'Add to favourites' }).click();
  await page.keyboard.press('Escape');
  await page.locator('#systemFavFilter').click();
  await expect(page.locator('#systemFavFilter')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#systemList')).toContainText('Hesper Drift');
  await expect(page.locator('#systemList')).not.toContainText('Ekwa Nexus');
});

test('filters by tag and deletes only on the second click', async ({ page }) => {
  await page.goto('./#systems');
  await page
    .locator('#systemTagFilters')
    .getByRole('button', { name: /trade-hub/ })
    .click();
  await expect(page.locator('#systemList')).toContainText('Ekwa Nexus');
  await expect(page.locator('#systemList')).not.toContainText('Hesper Drift');

  await page.locator('#systemList').getByText('Ekwa Nexus').click();
  await page.getByRole('button', { name: 'Delete system' }).click();
  expect((await storedState(page)).systems.some(item => item.id === 'sys-ekwa')).toBe(true);
  await page.getByRole('button', { name: 'Click again to delete this system' }).click();
  expect((await storedState(page)).systems.some(item => item.id === 'sys-ekwa')).toBe(false);
});

test('on a phone, dragging the sheet’s bar down closes it', async ({ page, browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone' || browserName !== 'chromium', 'touch drag on the phone sheet');
  await page.goto('./#systems');
  await page.locator('#systemList').getByText('Ekwa Nexus').click();
  const handle = page.locator('#systemPanel [data-sheet-handle]');
  await expect(handle).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toHaveCount(1); // the bar, no ✕
  // Measure once the sheet has finished sliding in: under a loaded machine the animation runs long, and a box taken
  // mid-slide puts the touch beside the bar.
  let box = await handle.boundingBox();
  await expect
    .poll(async () => {
      const previous = box;
      box = await handle.boundingBox();
      return previous.y === box.y;
    })
    .toBe(true);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [{ x, y }]);
  for (let step = 1; step <= 10; step++) await touch('touchMove', [{ x, y: y + step * 25 }]);
  await touch('touchEnd', []);
  await expect(page.locator('#systemPanel')).toHaveAttribute('aria-hidden', 'true');
});
