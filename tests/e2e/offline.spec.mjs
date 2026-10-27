// Runs only in the `offline` project, the one place the service worker is allowed (playwright.config.ts).
// Install once online, then cut the network: every screen, the wiki dataset and an article read earlier still work.
import { test, expect } from './fixtures.mjs';

const OXYGEN = './wiki/#/a/' + encodeURIComponent('wiki/resources/Oxygen.md');

test('after one online visit, the app and the Codex work offline', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready); // resolves once the precache is complete
  await page.goto(OXYGEN); // read once online, so the article is cached
  await expect(page.locator('#articleBody h2', { hasText: 'Quick Facts' })).toBeVisible();

  await context.setOffline(true);

  await page.goto('./');
  await expect(page.locator('#homeNow')).toContainText('Ekwa Nexus');
  await page.goto('./#systems');
  await expect(page.locator('#systemList')).toContainText('Hesper Drift');
  await page.goto('./#calculators');
  await expect(page.locator('#planResult tbody tr', { hasText: 'Radon' })).toContainText('500');

  await page.goto('./wiki/#/?q=oxygen');
  await expect(page.locator('#browseBody .result').first()).toContainText('Oxygen');
  await page.goto(OXYGEN);
  await expect(page.locator('#articleHeader h1')).toHaveText('Oxygen');
  await expect(page.locator('#articleBody h2', { hasText: 'Quick Facts' })).toBeVisible();
});
