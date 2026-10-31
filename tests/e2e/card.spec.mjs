import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.mjs';

test('the Traveller Card from Settings: the front, then its back, both accessible', async ({ page }) => {
  await page.goto('./#more');
  await page.getByRole('link', { name: /Traveller Card/ }).click();
  await expect(page).toHaveURL(/#card$/);
  const front = page.getByRole('region', { name: 'Traveller Card, front' });
  await expect(front.getByRole('img', { name: /Class [CBAS]/ })).toBeVisible();
  await expect(front).toContainText(/game v\d+\.\d+/);
  let { violations } = await new AxeBuilder({ page }).include('#sec-card').analyze();
  expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);

  await page.locator('#travellerCard').click({ position: { x: 60, y: 300 } }); // a tap on the card flips it
  const back = page.getByRole('region', { name: 'Traveller Card, back' });
  await expect(back.getByRole('tab', { name: 'Reading this card' })).toHaveAttribute('aria-selected', 'true');
  await expect(back).toContainText('Vortices');
  ({ violations } = await new AxeBuilder({ page }).include('#sec-card').analyze());
  expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
});
