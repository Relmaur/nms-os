import { test, expect, storedState } from './fixtures.mjs';

test('pasting a list adds outlaw systems', async ({ page }) => {
  await page.goto('./#outlaw');
  await page.getByRole('button', { name: 'Paste a list' }).click();
  await page.locator('#outlawBulkInput').fill('Den Two | 0123456789AB | Far Reach\nDen Three');
  await page.locator('#outlawBulkForm button[type="submit"]').click();
  await expect(page.locator('#outlawSummary')).toContainText('3 outlaw systems');
  const added = (await storedState(page)).systems.filter(system => system.tags.includes('outlaw'));
  expect(added.map(system => system.name).sort()).toEqual(['Den Three', 'Den Two', 'Outlaw Den']);
});

test('a packet run starts the restock timer', async ({ page }) => {
  await page.goto('./#outlaw');
  await page.locator('#outlawRunList').getByRole('button', { name: 'Visited' }).click();
  await expect(page.locator('#toastMessage')).toHaveText('Logged Outlaw Den. Ready again in 24h.');
  await expect(page.locator('#outlawStationList')).toContainText('Ready in 24h');
  const den = (await storedState(page)).systems.find(system => system.id === 'sys-den');
  expect(den.visits).toHaveLength(1);
  expect(den.visits[0].packets).toBe(15);
});

test('your packet settings drive the estimates', async ({ page }) => {
  await page.goto('./#outlaw');
  await expect(page.locator('#outlawRunFooter')).toContainText('~5,250 Nanites');
  await page.locator('#outlawNanitesPerPacket').fill('500');
  await page.locator('#outlawNanitesPerPacket').press('Tab');
  await expect(page.locator('#outlawRunFooter')).toContainText('~7,500 Nanites');
  expect((await storedState(page)).outlaw.nanitesPerPacket).toBe(500);
});

test('the Runs tab opens Runs; a started run shows there in progress, against the wiki’s game version', async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'the tab bar shows below lg');
  await page.goto('./#home');
  await page.locator('#tabBar [data-tab="runs"]').click();
  await expect(page).toHaveURL(/#runs$/);
  const card = page.locator('#runsOutlaw');
  await expect(card).toContainText(/Works in v\d+\.\d+/); // the newest Update page in the mirror
  await expect(card).toContainText('1 of 1 station ready');
  await card.click();
  await expect(page).toHaveURL(/#outlaw$/);
  await expect(page.locator('#tabBar [data-tab="runs"]')).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Start a run' }).click();
  await page.locator('#outlawRunList').getByRole('button', { name: 'Visited' }).click();
  await page.locator('#tabBar [data-tab="runs"]').click();
  await expect(page.getByRole('heading', { name: 'In progress' })).toBeVisible();
  await expect(card).toContainText('Station 2 of 5');
  await expect(card).toContainText(/restock 2[34]h/);
  expect(Date.parse((await storedState(page)).outlaw.runStartedAt)).toBeGreaterThan(0);
});
