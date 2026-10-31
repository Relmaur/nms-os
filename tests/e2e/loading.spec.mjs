import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.mjs';

test.describe('data that can’t be read', () => {
  test.use({ expectedErrors: [/status of 404|Failed to load resource/] });

  test('the Codex shows its shape, then says what’s true, with no developer message', async ({ page }) => {
    let release;
    const held = new Promise(resolve => {
      release = resolve;
    });
    await page.route('**/wiki/{index.json,offline-bundle.js}', async route => {
      await held;
      await route.fulfill({ status: 404, body: '' });
    });
    await page.goto('./wiki/', { waitUntil: 'commit' }); // the page's own load waits on the held data
    await expect(page.getByRole('status').filter({ hasText: 'Loading the Codex' })).toBeAttached();
    await expect(page.locator('#bootSplash')).toHaveCount(0);
    release();
    const failed = page.getByRole('alert').filter({ hasText: /Couldn’t load the codex/ });
    await expect(failed).toBeVisible();
    await expect(page.locator('body')).not.toContainText('pnpm');
    const { violations } = await new AxeBuilder({ page }).include('#codexMain').analyze();
    expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('the planner offers another try, which works', async ({ page }) => {
    let broken = true;
    await page.route('**/wiki/game-data.json', route =>
      broken ? route.fulfill({ status: 404, body: '' }) : route.fallback()
    );
    await page.goto('./#crafts');
    await expect(page.getByRole('alert').filter({ hasText: /Couldn’t load the recipe data/ })).toBeVisible();
    broken = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('#sec-crafts')).toContainText(/top pick/i, { timeout: 20_000 });
    await expect(page.getByRole('alert').filter({ hasText: /Couldn’t load/ })).toHaveCount(0);
  });
});

test('the start-up screen leaves once the app has drawn', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#bootSplash')).toHaveCount(0);
  await expect(page.locator('#sec-home')).toBeVisible();
});
