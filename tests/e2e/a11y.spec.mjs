// Accessibility (axe) on the main screens. Screens already moved to React (ADR-0004 step 3) are gated: any violation
// fails. The rest report only (violations attached and summarised as an annotation) until their move.
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.mjs';

for (const [name, path, ready, gated] of [
  ['Home', './', '#homeNow', true],
  ['Systems', './#systems', '#systemList', false],
  ['Calculators', './#calculators', '#planResult', false],
  ['Codex', './wiki/', '#browseBody', false]
]) {
  test(`axe: ${name}`, async ({ page }, testInfo) => {
    await page.goto(path);
    await expect(page.locator(ready)).toBeVisible();
    // Gated screens are checked on their own content: the vanilla header and navigation have their own findings.
    const builder = new AxeBuilder({ page });
    const { violations } = await (gated ? builder.include(`#sec-${name.toLowerCase()}`) : builder).analyze();
    await testInfo.attach('axe-violations.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json'
    });
    testInfo.annotations.push({
      type: 'axe',
      description: violations.length
        ? violations.map(v => `${v.id} (${v.impact}, ${v.nodes.length})`).join('; ')
        : 'no violations'
    });
    if (gated) expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
