// Accessibility (axe) on the main screens. Screens already moved to React (ADR-0004 step 3) are gated: any violation
// fails. The rest report only (violations attached and summarised as an annotation) until their move.
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.mjs';

const openPanel = page => page.locator('#systemList').getByText('Ekwa Nexus').click();
const openEditor = async page => {
  await openPanel(page);
  await page.getByRole('button', { name: 'Edit system' }).click();
};

const tickHalf = async page => {
  const tiles = await page.locator('#planHold label').all();
  for (const tile of tiles.slice(0, 7)) await tile.click();
};

const OXYGEN = encodeURIComponent('wiki/resources/Oxygen.md');
const openPeek = page => page.locator('#browseBody .result button').first().click();
// The index bar is the phone and tablet layout; from lg the same index is the rail, already on screen.
const openIndex = async page => {
  const bar = page.locator('#articleIndexBar button').first();
  if (await bar.isVisible()) await bar.click();
};
const openCamp = page => page.getByRole('tab', { name: 'Registers' }).click();

// [name, path, ready selector, gated region (or null to report only), setup]
for (const [name, path, ready, region, setup] of [
  ['Home', './', '#homeNow', '#sec-home'],
  ['Systems', './#systems', '#systemList', '#sec-systems'],
  ['Outlaw Run', './#outlaw', '#outlawStationList', '#sec-outlaw'],
  ['System panel', './#systems', '#systemNotes', '#systemPanel', openPanel],
  ['System editor', './#systems', '#systemEditor', '#systemPanel', openEditor],
  ['Calculators', './#calculators', '#planHold', '#sec-calculators'],
  ['Guides', './#guides', '#guidesList a >> nth=0', '#sec-guides'],
  ['Book I (checklists)', './#book1', '#checklist-milestones input >> nth=0', '#sec-book1'],
  ['Book III (tables)', './#book3', '#sec-book3 table >> nth=0', '#sec-book3'],
  ['More', './#more', '#installRow', '#sec-more'],
  ['Calculators, mid-plan', './#calculators', '#planHold', '#sec-calculators', tickHalf],
  ['Calculators, Registers', './#calculators', '#calcReg1', '#sec-calculators', openCamp],
  ['Codex', './wiki/', '#browseBody', '#codexRoot'],
  ['Codex results', './wiki/#/?q=oxygen', '#browseBody .result >> nth=0', '#codexRoot'],
  ['Codex quick look', './wiki/#/?q=oxygen', '#peekBody h2 >> nth=0', '#codexRoot', openPeek],
  ['Codex article', `./wiki/#/a/${OXYGEN}`, '#articleBody h2 >> nth=0', '#codexRoot'],
  ['Codex article index', `./wiki/#/a/${OXYGEN}`, '#articleBody h2 >> nth=0', '#codexRoot', openIndex]
]) {
  test(`axe: ${name}`, async ({ page }, testInfo) => {
    await page.goto(path);
    await setup?.(page);
    await expect(page.locator(ready)).toBeVisible();
    // Gated screens are checked on their own content: the vanilla header and navigation have their own findings.
    const builder = new AxeBuilder({ page });
    const { violations } = await (region ? builder.include(region) : builder).analyze();
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
    if (region) expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
