import { test, expect, storedState, expectNoHorizontalOverflow } from './fixtures.mjs';

test('Home shows the current system, warp-back list and outlaw run', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#homeNow')).toContainText('Ekwa Nexus');
  await expect(page.locator('#homeNow')).toContainText('S-class hauler spawns here');
  await expect(page.locator('#homeRecent')).toContainText('Hesper Drift');
  await expect(page.locator('#homeOutlaw')).toContainText('1 of 1 ready');
  await expect(page.locator('#homePhase')).toHaveText('Phase 3: Test run');
});

test('Log visit records a visit on the current system', async ({ page }) => {
  await page.goto('./');
  await page.locator('#homeNow').getByRole('button', { name: 'Log visit' }).click();
  await expect(page.locator('#toastMessage')).toHaveText('Logged a visit to Ekwa Nexus.');
  const state = await storedState(page);
  expect(state.systems.find(system => system.id === 'sys-ekwa').visits).toHaveLength(2);
});

test('"I’m here" makes a recent system the current one', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'I’m here: Hesper Drift' }).click();
  await expect(page.locator('#homeNow')).toContainText('Hesper Drift');
});

test('the #new-system shortcut opens the Add system editor', async ({ page }) => {
  await page.goto('./#new-system');
  await expect(page.locator('#systemPanel')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#systemPanelTitle')).toHaveText('Add system');
  await expect(page).toHaveURL(/#home$/);
});

test('no section scrolls sideways', async ({ page }) => {
  for (const section of [
    'home',
    'systems',
    'outlaw',
    'calculators',
    'guides',
    'more',
    'book1',
    'book2',
    'book3',
    'book4',
    'book5',
    'book6'
  ]) {
    await page.goto(`./#${section}`);
    await expect(page.locator(`#sec-${section}`)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});
