// The app runs edge to edge on a phone, so a screen must clear the status bar itself. Chromium can simulate the notch;
// art may reach the top of the screen, but no text or control may sit under it.
import { test, expect } from './fixtures.mjs';

const NOTCH = 47;
const SCREENS = [
  '#home',
  '#systems',
  '#system/sys-ekwa',
  '#system/missing',
  '#map',
  '#gear',
  '#ship/gear-kestrel',
  '#ship/missing',
  '#notes',
  '#note/note-grid',
  '#note/missing',
  '#runs',
  '#outlaw',
  '#card',
  '#cards',
  '#frontier',
  '#calculators',
  '#crafts',
  '#plan/Carbon',
  '#plan/missing',
  '#guides',
  '#book1',
  '#more',
  '#session',
  'wiki/',
  'wiki/#/?q=oxygen',
  `wiki/#/a/${encodeURIComponent('wiki/resources/Oxygen.md')}`
];

const highest = page =>
  page.evaluate(() => {
    let best = null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el.closest('[aria-hidden="true"], nav, .sr-only, [inert], #toastBanner')) continue;
      const hasText = [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
      if (!hasText && !['BUTTON', 'INPUT'].includes(el.tagName)) continue;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      if (style.visibility === 'hidden' || !box.width || !box.height || box.bottom <= 0) continue;
      if (!best || box.top < best.top) best = { top: Math.round(box.top), text: el.textContent.trim().slice(0, 30) };
    }
    return best;
  });

test('no screen puts text or a control under the status bar', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'only a phone has a notch');
  test.setTimeout(90_000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: NOTCH, bottom: 34, left: 0, right: 0 } });
  const under = [];
  for (const screen of SCREENS) {
    await page.goto(`./${screen}`);
    await expect(page.locator('#bootSplash')).toHaveCount(0);
    await page.waitForTimeout(400);
    const top = await highest(page);
    if (top && top.top < NOTCH) under.push(`${screen}: "${top.text}" at ${String(top.top)}px`);
  }
  expect(under).toEqual([]);
});
