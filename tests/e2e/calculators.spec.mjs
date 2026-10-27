import { test, expect } from './fixtures.mjs';

// The planner's cargo hold: one tile per raw material, with its total.
const rawMaterials = page =>
  page
    .locator('#planResult [data-raw]')
    .evaluateAll(tiles => Object.fromEntries(tiles.map(tile => [tile.dataset.raw, Number(tile.dataset.qty)])));

test('the Stasis Device plan matches the wiki’s totals', async ({ page }) => {
  await page.goto('./#calculators');
  await expect(page.locator('#planResult [data-raw]').first()).toBeVisible();
  expect(await rawMaterials(page)).toEqual({
    Radon: 500,
    Sulphurine: 500,
    Nitrogen: 500,
    'Gamma Root': 400,
    'Frost Crystal': 300,
    'Condensed Carbon': 300,
    Solanium: 200,
    'Star Bulb': 200,
    'Ionised Cobalt': 150,
    'Cactus Flesh': 100,
    Faecium: 50,
    Paraffinium: 50,
    Phosphorus: 50,
    Dioxite: 50
  });
  await expect(page.locator('#planResult dl')).toContainText('15.6M Units');
});

test('switching an alternative recipe changes the plan', async ({ page }) => {
  await page.goto('./#calculators');
  await page.locator('#planPresets').getByRole('button', { name: 'Anomalous Doughnut' }).click();
  await expect(page.locator('#planItem')).toHaveValue('Anomalous Doughnut');
  expect(await rawMaterials(page)).toMatchObject({ 'Fresh Milk': 2, Grahberry: 2 });
  await page.locator('#planResult button[data-title="Clarified Oil"]').click();
  expect(await rawMaterials(page)).toMatchObject({ 'Fresh Milk': 1, 'Warm Proto-Milk': 1 });
});

test('ticks build the plan upward and survive a reload', async ({ page }) => {
  await page.goto('./#calculators');
  const roundOne = page.locator('#planResult li:has(> div > h4:text-is("Round 1"))');
  await expect(roundOne).toContainText('Needs the cargo hold');
  for (const tile of await page.locator('#planHold label').all()) await tile.click();
  await expect(page.locator('#planHold')).toContainText('14 of 14 gathered');
  await expect(roundOne).toContainText('Ready to craft');
  await page.reload();
  await expect(page.locator('#planHold')).toContainText('14 of 14 gathered');
  await page.getByRole('button', { name: 'One more' }).click();
  await expect(page.locator('#planHold')).toContainText('0 of 14 gathered'); // a different plan starts fresh
});

test('base value and extractor yield use wiki values', async ({ page }) => {
  await page.goto('./#calculators');
  await page.getByRole('tab', { name: 'Base value' }).click();
  await expect(page.locator('#valueTotal')).toHaveText('Total: 53,900 Units');
  await page.getByRole('tab', { name: 'Extractors' }).click();
  await page.locator('#mineCount').fill('4');
  await page.locator('#mineRate').fill('250');
  await expect(page.locator('#mineResult')).toContainText('1,000 Gold per hour, worth 353,000 Units');
});

test('Harmonic Camp registers evaluate the expressions', async ({ page }) => {
  await page.goto('./#calculators');
  await page.getByRole('tab', { name: 'Registers' }).click();
  await expect(page.locator('#calcAns3')).toHaveText('16');
  await page.locator('#calcReg1').fill('3 * 3');
  await expect(page.locator('#calcAns1')).toHaveText('9');
});

test('the dock keeps the chosen tool while the app is open', async ({ page }) => {
  await page.goto('./#calculators');
  await expect(page.getByRole('tab', { name: /^Recipe planner/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#calcPlanSummary')).toContainText('Stasis Device');
  await page.getByRole('tab', { name: 'Registers' }).click();
  await page.locator('#calcReg1').fill('3 * 3');
  await page.evaluate(() => {
    location.hash = '#systems';
  });
  await expect(page.locator('#sec-systems')).toBeVisible();
  await page.evaluate(() => {
    location.hash = '#calculators';
  });
  await expect(page.locator('#calcAns1')).toHaveText('9');
  await expect(page.locator('#planHold')).toBeHidden();
});
