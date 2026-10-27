import { test, expect } from './fixtures.mjs';

test('the Codex landing shows the verification result and all categories', async ({ page }) => {
  await page.goto('./wiki/');
  // verification.json only exists after a sync or verify, so either state is valid here.
  await expect(page.locator('#browseBody')).toContainText(
    /Matches the wiki|Not verified on this copy|behind the wiki|couldn’t be reached/
  );
  await expect(page.locator('#browseBody a.group')).toHaveCount(10);
});

test('search finds Oxygen and the article cites its wiki revision', async ({ page }) => {
  await page.goto('./wiki/#/?q=oxygen');
  await expect(page.locator('#browseBody .result').first()).toContainText('Oxygen');
  await page.goto('./wiki/#/a/' + encodeURIComponent('wiki/resources/Oxygen.md'));
  await expect(page.locator('#articleHeader h1')).toHaveText('Oxygen');
  await expect(page.locator('#articleHeader')).toContainText(/Wiki revision \d+/);
  await expect(page.locator('#articleRail')).toContainText('Used in');
  // Rendered as HTML, not shown as raw Markdown.
  await expect(page.locator('#articleBody h2', { hasText: 'Quick Facts' })).toBeVisible();
  await expect(page.locator('#articleBody')).not.toContainText('**');
});

test('obsolete pages appear only when asked for', async ({ page }) => {
  const count = async () => Number((await page.locator('#resultsHeader strong').innerText()).replace(/,/g, ''));
  await page.goto('./wiki/#/?q=blaze%20javelin');
  await expect(page.locator('#resultsHeader strong')).toBeVisible();
  const current = await count();
  await page.goto('./wiki/#/?q=blaze%20javelin&old=1');
  await expect.poll(count).toBeGreaterThan(current);
});

test('the main app’s header search reaches wiki articles', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'the phone opens search from a button; covered on desktop');
  await page.goto('./');
  await page.locator('#globalSearchInput').fill('oxygen');
  await expect(page.locator('#globalSearchResults')).toContainText('Oxygen');
});

test('on a phone the article index is at the top, and follows the reader', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'below lg the index is a bar and a sheet; desktop has the rail');
  await page.goto('./wiki/#/a/' + encodeURIComponent('wiki/resources/Oxygen.md'));
  const bar = page.locator('#articleIndexBar');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('Used in');
  // The bar sits above the article body, not below it.
  const barTop = (await bar.boundingBox()).y;
  expect(barTop).toBeLessThan((await page.locator('#articleBody').boundingBox()).y);
  await bar.getByRole('button', { name: /Used in/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Index of Oxygen' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'Used in' })).toBeInViewport();
  await sheet.getByRole('button', { name: 'Close the index' }).click(); // the bar (no ✕ on phones)
  await expect(sheet).toBeHidden();
  // Partway down, the strip offers the index again and picks a section.
  await page.locator('#articleBody h2').nth(2).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /Index/ }).click();
  await sheet.getByRole('button', { name: 'Quick Facts' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('#articleBody h2', { hasText: 'Quick Facts' })).toBeInViewport();
});

test('the quick look opens from results and closes with its bar on a phone', async ({ page }, testInfo) => {
  await page.goto('./wiki/#/?q=oxygen');
  await page.locator('#browseBody .result button').first().click();
  const panel = page.locator('#peekPanel');
  await expect(panel).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#peekTitle')).toHaveText('Oxygen');
  if (testInfo.project.name === 'phone') {
    await expect(page.getByRole('button', { name: 'Close quick look' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Close quick look' }).click();
  } else await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
});

test('a new article saves as a draft and opens', async ({ page }) => {
  await page.goto('./wiki/');
  await page.getByRole('button', { name: 'New article' }).click();
  await page.getByRole('textbox', { name: 'Article title' }).fill('Test Notes');
  await page.getByRole('textbox', { name: 'Article Markdown' }).fill('Links to [[Oxygen]].');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Save draft/ }).click();
  expect((await download).suggestedFilename()).toBe('Test_Notes.md');
  await expect(page.locator('#articleHeader h1')).toHaveText('Test Notes');
  await expect(page.locator('#articleBody a', { hasText: 'Oxygen' })).toBeVisible();
});
