import { test, expect, storedState } from './fixtures.mjs';

test('a session with a one-minute timer: the bar counts down, then announces it once', async ({ page }) => {
  await page.clock.install();
  await page.goto('./');
  await page.locator('#startSession').click();
  await page.locator('#sessionBar').click(); // starting shows the bar; the bar opens the sheet
  const sheet = page.locator('#sessionSheet');
  await expect(sheet).toHaveAttribute('aria-hidden', 'false');
  await sheet.getByRole('button', { name: /Custom/ }).click();
  await sheet.getByLabel('Name').fill('Storm passes');
  await sheet.getByLabel('Minutes').fill('1');
  await sheet.getByRole('button', { name: /^Start timer/ }).click();
  await expect(sheet.locator('#timerList')).toContainText('Storm passes');
  await page.keyboard.press('Escape'); // closes the sheet on a phone and on desktop
  await expect(sheet).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#sessionBar')).toContainText('Storm passes');
  await page.clock.fastForward('01:05');
  await expect(page.locator('#toastMessage')).toHaveText('Timer done: Storm passes.');
  await expect(page.locator('#sessionBar')).toContainText('Storm passes done');
  const state = await storedState(page);
  expect(state.timers[0]).toMatchObject({ label: 'Storm passes', alerted: true });
  expect(state.session.timersDone).toBe(1);
});

test('timers and the session survive a reload and end in a recap', async ({ page }) => {
  await page.goto('./');
  await page.locator('#startSession').click();
  await page.locator('#sessionBar').click();
  const sheet = page.locator('#sessionSheet');
  await sheet.getByRole('button', { name: /Crop/ }).click();
  await sheet.getByLabel('Crop').fill('Frostwort');
  await sheet.getByLabel('Minutes').fill('60');
  await sheet.getByRole('button', { name: /Start crop timer/ }).click();
  await page.reload();
  await expect(page.locator('#sessionBar')).toContainText('Frostwort');
  await page.locator('#sessionBar').click();
  await page.locator('#sessionSheet').getByRole('button', { name: 'End session' }).click();
  await expect(page.locator('#sessionRecap')).toContainText('Played');
  expect((await storedState(page)).sessions).toHaveLength(1);
  // An End tapped by mistake is undone from the recap.
  await page.locator('#sessionSheet').getByRole('button', { name: 'Resume session' }).click();
  await expect(page.locator('#sessionBar')).toContainText('Session');
  expect((await storedState(page)).sessions).toHaveLength(0);
});
