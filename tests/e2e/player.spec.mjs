// The player's own content: ships & Multi-Tools, and notes pinned to Home and the books. A new player starts with
// none of anyone else's.
import { test, expect, storedState } from './fixtures.mjs';

test.describe('a new player', () => {
  test.use({ seed: null });

  test('starts with an empty fleet, no phase and nothing personal in the guides', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('#fleetCardBody')).toContainText('Add your ship and Multi-Tools');
    await expect(page.locator('#homePhase')).toHaveCount(0);
    for (const book of ['book2', 'book3', 'book5']) {
      await page.goto(`./#${book}`);
      await expect(page.locator(`#sec-${book}`)).toBeVisible();
      await expect(page.locator(`#sec-${book}`)).not.toContainText(/Ythgall|Aeron|Defiance of Thought|Light Capacitor/);
    }
    expect((await storedState(page))?.systems ?? []).toEqual([]);
  });
});

test.describe('a note synced from a paired device', () => {
  const hostile = [
    '<img src="https://evil.example/x.png">',
    '<p style="position:fixed;inset:0" id="headerRoot" name="x" onclick="alert(1)">styled</p>',
    '<script>alert(1)</script>',
    '[click](javascript:alert(1)) [data](data:text/html,hi) [away](//evil.example) [wiki](https://nomanssky.fandom.com)',
    '| a |\n|---|\n| b |'
  ].join('\n\n');
  test.use({
    seed: {
      meta: { version: '2.0.0' },
      notes: [{ id: 'note-x', title: 'Hostile', body: hostile, pins: ['home'], createdAt: '2026-10-20T00:00:00Z' }]
    }
  });

  test('renders only safe Markdown: no images, styles, ids, scripts or script links', async ({ page }) => {
    await page.goto('./');
    const body = page.locator('#sec-home [data-note="note-x"] .md-body');
    await expect(body.locator('table')).toContainText('b');
    const html = await body.innerHTML();
    expect(html).not.toMatch(/<img|style=|id=|name=|onclick|<script|javascript:|data:|evil\.example/);
    await expect(body.getByRole('link', { name: 'wiki' })).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

test('a ship added from Home shows in the fleet card and in Ships & Multi-Tools', async ({ page }) => {
  await page.goto('./#gear');
  await page.locator('#sec-gear').getByRole('button', { name: 'Add starship' }).click();
  await page.locator('#gearName').fill('Vela Run');
  await page.locator('#gearEditor').getByLabel('Class', { exact: true }).fill('A');
  await page.locator('#slotPicker [data-slot="R1C2"]').click();
  await page.locator('#slotPicker [data-slot="R1C1"]').click();
  await page.locator('#gearEditor [data-slot-label="R1C2"]').fill('Pulse Drive upgrade');
  await page.locator('#gearEditor').getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('#toastMessage')).toHaveText('Added Vela Run.');
  const card = page.locator('#sec-gear [data-gear]').filter({ hasText: 'Vela Run' });
  await expect(card.getByRole('list', { name: 'Supercharged slots' })).toHaveText(/R1C1\s*R1C2\s*Pulse Drive upgrade/);
  await page.goto('./');
  await expect(page.locator('#fleetCardBody')).toContainText('Kestrel IV');
  await expect(page.locator('#fleetCardBody')).toContainText('Vela Run');
  const saved = (await storedState(page)).gear.find(item => item.name === 'Vela Run');
  expect(saved.superchargedSlots).toEqual(['R1C1', 'R1C2']);
});

test('a supercharged slot is marked with a tap and cleared with another', async ({ page }) => {
  await page.goto('./#gear');
  await page.locator('#sec-gear').getByRole('button', { name: 'Edit Kestrel IV' }).click();
  await page.locator('#gearEditor').getByRole('button', { name: '+ Add a row' }).click();
  await expect(page.locator('#slotPicker [data-slot="R5C1"]')).toBeVisible();
  const cell = page.locator('#slotPicker [data-slot="R2C3"]');
  await expect(cell).toHaveAttribute('aria-pressed', 'true');
  await cell.click();
  await expect(cell).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#gearEditor').getByRole('button', { name: 'Save' }).click();
  await expect(
    page.locator('#sec-gear [data-gear="gear-kestrel"]').getByRole('list', { name: 'Supercharged slots' })
  ).toHaveText(/R2C2\s*R2C4/);
});

test('a note pinned to Book III shows under the book and on Home, rendered and safe', async ({ page }) => {
  await page.goto('./#book3');
  const pinned = page.locator('#sec-book3 [data-player]');
  await expect(pinned.locator('[data-note="note-grid"] table')).toContainText('Best scanner');
  await expect(pinned.getByRole('link', { name: 'Oxygen' })).toHaveAttribute('href', 'wiki/#/?q=Oxygen');
  await page.goto('./');
  await expect(page.locator('#sec-home [data-note="note-grid"]')).toBeVisible();
});

test('a new note from a book starts pinned there; the header search finds it', async ({ page }, testInfo) => {
  await page.goto('./#book2');
  await page.getByRole('button', { name: 'Add a note to Book II' }).click();
  await page.locator('#noteTitle').fill('Outlaw loop timing');
  await page.locator('#noteBody').fill('Go back after **24 h**. <img src=x onerror=alert(1)>');
  await page.locator('#noteEditor').getByRole('button', { name: 'Add note' }).click();
  const card = page.locator('#sec-book2 [data-player] [data-note]').filter({ hasText: 'Outlaw loop timing' });
  await expect(card.locator('strong')).toHaveText('24 h');
  await expect(card.locator('img')).toHaveCount(0);
  expect((await storedState(page)).notes.find(note => note.title === 'Outlaw loop timing').pins).toEqual(['book2']);

  if (testInfo.project.name === 'phone') await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.locator('#globalSearchInput').fill('loop timing');
  await page
    .locator('#globalSearchResults')
    .getByRole('option', { name: /Outlaw loop timing/ })
    .click();
  await expect(page).toHaveURL(/#notes$/);
});

test('Markdown files import as notes', async ({ page }) => {
  await page.goto('./#notes');
  await page.locator('#sec-notes input[type="file"]').setInputFiles([
    { name: 'routes.md', mimeType: 'text/markdown', buffer: Buffer.from('# Trade routes\n\n- Ekwa → Hesper') },
    { name: 'plain.md', mimeType: 'text/markdown', buffer: Buffer.from('No heading here') }
  ]);
  await expect(page.locator('#toastMessage')).toHaveText('Imported 2 notes.');
  await expect(page.locator('#notesList')).toContainText('Trade routes');
  await expect(page.locator('#notesList')).toContainText('plain');
});
