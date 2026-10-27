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
