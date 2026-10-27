import { test, expect } from './fixtures.mjs';

test('on a phone, the search opens full screen, finds a system and opens it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the phone opens search from a button; desktop types in the header');
  await page.goto('./');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const input = page.locator('#globalSearchInput');
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await input.fill('ekwa');
  await page
    .locator('#globalSearchResults')
    .getByRole('option', { name: /Ekwa Nexus/ })
    .click();
  await expect(page).toHaveURL(/#systems$/);
  await expect(page.locator('#systemPanelTitle')).toHaveText('Ekwa Nexus');
  await expect(input).toBeHidden();
});

test('/ starts a search, and Escape leaves it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'no hardware keyboard on the phone run');
  await page.goto('./#outlaw');
  await page.keyboard.press('/');
  await expect(page.locator('#globalSearchInput')).toBeFocused();
  await page.keyboard.type('hesper');
  await expect(page.locator('#globalSearchResults')).toContainText('Hesper Drift');
  await page.keyboard.press('Escape');
  await expect(page.locator('#globalSearchResults')).toBeHidden();
});

test('the tab bar counts ready outlaw stations and marks where you are', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the tab bar shows below lg');
  await page.goto('./#guides');
  await expect(page.locator('#tabOutlawBadge')).toHaveText('1');
  await expect(page.locator('#tabBar [data-tab="more"]')).toHaveAttribute('aria-current', 'page');
});

test('old and shortcut addresses still land', async ({ page }) => {
  await page.goto('./#logbook');
  await expect(page.locator('#sec-systems')).toBeVisible();
  await expect(page).toHaveURL(/#systems$/);
  await page.goto('./#nowhere');
  await expect(page.locator('#sec-home')).toBeVisible();
});
