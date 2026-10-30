// Runs only in the `offline` project, the one place the service worker is allowed (playwright.config.ts).
// Install once online, then cut the network: every screen, the wiki dataset and an article read earlier still work.
import { test, expect, holdToStartSession } from './fixtures.mjs';

const OXYGEN = './wiki/#/a/' + encodeURIComponent('wiki/resources/Oxygen.md');

test('after one online visit, the app and the Codex work offline', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready); // resolves once the precache is complete
  await page.goto(OXYGEN); // read once online, so the article is cached
  await expect(page.locator('#articleBody h2', { hasText: 'Quick Facts' })).toBeVisible();

  await context.setOffline(true);

  await page.goto('./?source=homescreen'); // any other address in scope falls back to the app page
  await expect(page.locator('#homeNow')).toContainText('Ekwa Nexus');
  await page.goto('./#systems');
  await expect(page.locator('#systemList')).toContainText('Hesper Drift');
  await page.goto('./#calculators');
  await expect(page.locator('#planResult [data-raw="Radon"]')).toHaveAttribute('data-qty', '500');
  // The refiner timer's recipes come from the cached wiki dataset too.
  await page.goto('./#home');
  await holdToStartSession(page);
  await page.locator('#sessionBar').click();
  await page.getByRole('button', { name: 'Refiner timer' }).click();
  await page.locator('#timerSheet').getByLabel('What it makes').fill('Enriched Carbon');
  await page
    .locator('#timerSheet')
    .getByRole('button', { name: /Start refiner timer/ })
    .click();
  await expect(page.locator('#timerList')).toContainText('Enriched Carbon');

  await page.goto('./wiki/#/?q=oxygen');
  await expect(page.locator('#browseBody .result').first()).toContainText('Oxygen');
  await page.goto(OXYGEN);
  await expect(page.locator('#articleHeader h1')).toHaveText('Oxygen');
  await expect(page.locator('#articleBody h2', { hasText: 'Quick Facts' })).toBeVisible();
});
