import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.mjs';

const axe = async page => {
  const { violations } = await new AxeBuilder({ page }).include('main').analyze();
  expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
};

test('the collection: cards from the log, flip, next, copy and a 4:5 picture', async ({ page }) => {
  await page.goto('./#card');
  await page.getByRole('link', { name: 'Collection' }).click();
  await expect(page).toHaveURL(/#cards$/);
  await expect(page.locator('#collectionPosition')).toHaveText(/^1 of \d+$/);
  const total = Number((await page.locator('#collectionPosition').textContent()).split(' of ')[1]);
  expect(total).toBeGreaterThan(2);
  await expect(page.locator('body')).not.toContainText(/VERIFIED|WITNESSED/);
  await axe(page);

  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  await expect(page.locator('#cardRail section[aria-label$="back"]:not([inert])')).toContainText(/SEED/);
  await axe(page);
  await page.getByRole('button', { name: 'Flip', exact: true }).click();

  await page.locator('#cardRail').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#collectionPosition')).toHaveText(`2 of ${String(total)}`);

  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Share this card' });
  await expect(sheet.locator('#shareSize')).toHaveText('1080 × 1350');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    sheet.getByRole('button', { name: 'Save picture' }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/-card\.png$/);
  const bytes = await fs.readFile(await download.path());
  expect(bytes.length).toBeGreaterThan(50_000); // drawn, not blank

  await page.goto('./#frontier'); // going elsewhere closes the sheet
  await expect(sheet).toBeHidden();
});

test('a link opens one card', async ({ page }) => {
  await page.goto('./#cards/gear:gear-kestrel');
  await expect(page.locator('#cardRail section[aria-label="Kestrel IV, front"]:not([inert])')).toBeVisible();
  await expect(page.locator('#cardTrust')).toContainText('FLEET');
});

test('an empty log has an empty collection that says how to start', async ({ page }) => {
  await page.goto('./#cards');
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('nms_master_os_state'));
    state.systems = [];
    state.gear = [];
    localStorage.setItem('nms_master_os_state', JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator('body')).toContainText('Your collection starts here');
});

test('Frontier: what’s still out there, accessible, and shareable', async ({ page }) => {
  await page.goto('./#frontier');
  await expect(page.getByRole('heading', { name: 'Frontier', level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Star colours' })).toContainText(/\d \/ 5/);
  await axe(page);
  await page.getByRole('button', { name: 'Share my Frontier' }).click();
  await expect(page.getByRole('dialog', { name: 'Share my Frontier' }).locator('#shareSize')).toHaveText('1080 × 1350');
});
