// Accessibility (axe) on the main screens. Report-only until the screens move to React (ADR-0004 step 3), when
// it becomes a gate: violations are attached to the test report and summarised as an annotation, not failed on.
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.mjs';

for (const [name, path, ready] of [
  ['Home', './', '#homeNow'],
  ['Systems', './#systems', '#systemList'],
  ['Calculators', './#calculators', '#planResult'],
  ['Codex', './wiki/', '#browseBody']
]) {
  test(`axe: ${name}`, async ({ page }, testInfo) => {
    await page.goto(path);
    await expect(page.locator(ready)).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
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
  });
}
