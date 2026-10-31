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

test('on an iPhone, after the prompt, tilt turns the whole card and holds', async ({ page }) => {
  await page.addInitScript(() => {
    class Orientation extends Event {
      constructor(beta, gamma) {
        super('deviceorientation');
        this.beta = beta;
        this.gamma = gamma;
      }
      static requestPermission() {
        window.motionAsked = true;
        return Promise.resolve('granted');
      }
    }
    window.DeviceOrientationEvent = Orientation;
  });
  await page.goto('./#card');
  const stage = page.locator('#travellerCard');
  await stage.click({ position: { x: 60, y: 300 } });
  await stage.click({ position: { x: 60, y: 300 } }); // and back to the front
  await expect.poll(() => page.evaluate(() => window.motionAsked)).toBe(true);
  await expect(page.getByRole('region', { name: 'Traveller Card, front' })).toBeVisible();

  const card = page.locator('.card-tilt');
  const turn = () => card.evaluate(el => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m13));
  const orient = gamma =>
    page.evaluate(g => {
      window.dispatchEvent(new DeviceOrientationEvent(50, g));
    }, gamma);
  await orient(0); // how it's held is level
  await orient(10);
  await expect.poll(turn).toBeGreaterThan(Math.sin((6 * Math.PI) / 180));
  await page.waitForTimeout(1500);
  await orient(10);
  await expect.poll(turn).toBeGreaterThan(Math.sin((5 * Math.PI) / 180)); // a held tilt doesn't fade away
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => card.evaluate(el => getComputedStyle(el).transform)).toBe('none');
});

test('full screen: the card alone, clear of the notch, flips on a tap and closes', async ({
  page,
  context
}, testInfo) => {
  if (testInfo.project.name === 'phone') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
  }
  await page.goto('./#card');
  await page.getByRole('button', { name: 'Full screen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Traveller Card, full screen' });
  await expect(dialog).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).include('.card-full').analyze();
  expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);

  const viewport = page.viewportSize();
  const box = await page.locator('#travellerCard').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(-0.5);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
  if (testInfo.project.name === 'phone') expect(box.y).toBeGreaterThanOrEqual(47);
  // Nothing else shows: not the tab bar, not the screen's buttons.
  const atBottom = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('.tab-bar, nav') === null,
    [viewport.width / 2, viewport.height - 20]
  );
  expect(atBottom).toBe(true);

  await page.locator('#travellerCard').click({ position: { x: 60, y: 300 } });
  await expect(page.locator('#travellerCard [aria-label="Traveller Card, back"]')).toHaveAttribute(
    'aria-hidden',
    'false'
  );
  await page.getByRole('button', { name: 'Close full screen' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
});
