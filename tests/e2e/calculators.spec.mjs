import { test, expect } from './fixtures.mjs';

const rawMaterials = page => page.locator('#planResult tbody tr').evaluateAll(rows =>
  Object.fromEntries(rows.map(row => [row.cells[0].innerText.trim(), Number(row.cells[1].innerText.replace(/,/g, ''))])));

test('the Stasis Device plan matches the wiki’s totals', async ({ page }) => {
  await page.goto('./#calculators');
  await expect(page.locator('#planResult tbody tr').first()).toBeVisible();
  expect(await rawMaterials(page)).toEqual({
    Radon: 500, Sulphurine: 500, Nitrogen: 500, 'Gamma Root': 400, 'Frost Crystal': 300, 'Condensed Carbon': 300,
    Solanium: 200, 'Star Bulb': 200, 'Ionised Cobalt': 150, 'Cactus Flesh': 100, Faecium: 50, Paraffinium: 50,
    Phosphorus: 50, Dioxite: 50
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

test('base value and extractor yield use wiki values', async ({ page }) => {
  await page.goto('./#calculators');
  await expect(page.locator('#valueTotal')).toHaveText('Total: 53,900 Units');
  await page.locator('#mineCount').fill('4');
  await page.locator('#mineRate').fill('250');
  await expect(page.locator('#mineResult')).toContainText('1,000 Gold per hour, worth 353,000 Units');
});

test('Harmonic Camp registers evaluate the expressions', async ({ page }) => {
  await page.goto('./#calculators');
  await expect(page.locator('#calcAns3')).toHaveText('16');
  await page.locator('#calcReg1').fill('3 * 3');
  await expect(page.locator('#calcAns1')).toHaveText('9');
});
