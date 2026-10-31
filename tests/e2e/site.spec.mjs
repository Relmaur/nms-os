import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test('the product page: named right, accessible, nothing from anyone else, no sideways scroll', async ({ page }) => {
  const offsite = [];
  page.on('request', request => {
    if (!request.url().startsWith('http://localhost')) offsite.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' }); // the scan reads text at rest, not mid-arrival
  await page.goto('./');
  await expect(page).toHaveTitle("ATLAS:OS for No Man's Sky");
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A logbook for your travels in');
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => {
    scrollTo(0, document.body.scrollHeight);
  });
  await expect(page.getByText('Not affiliated with Hello Games')).toBeVisible();
  expect(offsite).toEqual([]);
});

test('its numbers are counted at build time, and it is complete with no script', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('./');
  await expect(page.locator('.stat b').nth(0)).toHaveText(/^\d{1,3}(,\d{3})+$/);
  await expect(page.locator('.stat b').nth(1)).toHaveText(/^\d+$|^\d{1,3}(,\d{3})+$/);
  expect(await page.locator('body').innerText()).not.toContain('{{');
  await expect(page.getByRole('heading', { name: 'Nothing.' })).toHaveCount(0); // the word is display type, not a heading
  await expect(page.getByText('Nothing.', { exact: true })).toBeVisible();
  await context.close();
});

test('every Open ATLAS goes straight into the app, and the other links are real', async ({ page }) => {
  await page.goto('./');
  const open = page.getByRole('link', { name: 'Open ATLAS' });
  expect(await open.count()).toBeGreaterThanOrEqual(3);
  for (const link of await open.all()) expect(await link.getAttribute('href')).toBe('./app/');
  await expect(page.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', 'mailto:hello@atlas-os.cloud');
  await expect(page.getByRole('link', { name: 'Leave a tip' })).toHaveAttribute('href', 'https://ko-fi.com/mlizardo');
  expect(await page.locator('a[href="#"]').count()).toBe(0);
});

test('with reduced motion everything is in place and still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  expect(await page.locator('.pre, .split-pending, .w').count()).toBe(0);
  await expect(page.locator('.hero .phone')).toHaveCSS('transform', 'none');
  await expect(page.locator('#sky')).toBeAttached();
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#sun .breathe')).animationName)).toBe(
    'none'
  );
});

test('scrolling: the hero phone turns flat, what is below arrives, and no words stay hidden', async ({ page }) => {
  await page.goto('./');
  const turn = () =>
    page.locator('.hero .phone').evaluate(el => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m13));
  await expect.poll(turn).toBeGreaterThan(0.1);
  await page.evaluate(() => {
    scrollTo({ top: innerHeight, behavior: 'instant' });
  });
  await expect.poll(turn).toBeLessThan(0.01);
  expect(await page.locator('#yours h2 .wi').count()).toBeGreaterThan(0);
  await page.locator('#yours h2').scrollIntoViewIfNeeded();
  await expect(page.locator('#yours h2')).not.toHaveClass(/\bpre\b/);
  await expect(page.locator('#yours h2')).not.toHaveClass(/\brising\b/, { timeout: 8000 }); // the sunlight comes back
  await expect(page.locator('.stat b').first()).toHaveText(/^\d{1,3}(,\d{3})+$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('on a desktop the phone stays pinned and its screen changes with the chapter', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'site-desktop', 'phones give each chapter its own phone');
  await page.goto('./');
  await page.locator('.chapter').nth(3).scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const chapter = document.querySelectorAll('.chapter')[3];
    scrollTo({ top: scrollY + chapter.getBoundingClientRect().top - innerHeight * 0.3, behavior: 'instant' });
  });
  await expect(page.locator('.chapter').nth(3)).toHaveClass(/\bon\b/);
  await expect(page.locator('.stack .layer').nth(3)).toHaveClass(/\bon\b/);
  await expect(page.locator('#banner')).toHaveClass(/\bon\b/); // Refiner done
  await expect(page.locator('.dots i').nth(3)).toHaveClass(/\bon\b/);
});
