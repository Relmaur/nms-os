// Accessibility (axe) on every screen and the page frame: any violation in the gated region fails. An entry without a
// region reports only (violations attached and summarised as an annotation); none is left.
import AxeBuilder from '@axe-core/playwright';
import { test, expect, holdToStartSession } from './fixtures.mjs';

const openEditor = async page => {
  await page.locator('#systemList').getByText('Ekwa Nexus').click();
  await page.getByRole('button', { name: 'Edit system' }).click();
};
const openPlanet = page => page.getByRole('button', { name: /^Add planet/ }).click();

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
const openGearEditor = page => page.locator('#sec-gear').getByRole('button', { name: 'Edit Kestrel IV' }).click();
const openNoteEditor = page => page.locator('#sec-notes').getByRole('button', { name: 'New note' }).click();
const openCamp = page => page.getByRole('tab', { name: 'Registers' }).click();
const liveSession = async page => {
  await holdToStartSession(page);
  await page.locator('#sessionBar').click();
  await page.locator('#sessionClock').waitFor();
};
const openTimerSheet = async page => {
  await liveSession(page);
  await page.getByRole('button', { name: 'Custom timer' }).click();
};
const showRecap = async page => {
  await liveSession(page);
  await page.locator('#sec-session').getByRole('button', { name: 'End session' }).click();
};

const openBestCrafts = async page => {
  await page.getByRole('tab', { name: 'Best crafts' }).click();
  await page.locator('#craftList [data-craft] >> nth=0').waitFor();
};

// [name, path, ready selector, gated region (or null to report only), setup]
for (const [name, path, ready, region, setup] of [
  ['Home', './', '#homeNow', '#sec-home'],
  ['Page frame (header, sidebar, tab bar)', './', '#homeNow', 'body'],
  ['Page frame on Systems', './#systems', '#systemList', 'body'],
  ['Page frame on Outlaw Run', './#outlaw', '#outlawStationList', 'body'],
  ['Session', './#session', '#timersTitle', '#sec-session'],
  ['Session live', './', '#timersTitle', '#sec-session', liveSession],
  ['Timer sheet', './', '#timersTitle', '#timerSheet', openTimerSheet],
  ['Session recap', './', '#timersTitle', '#sec-session', showRecap],
  ['Systems', './#systems', '#systemList', '#sec-systems'],
  ['Outlaw Run', './#outlaw', '#outlawStationList', '#sec-outlaw'],
  ['System detail', './#system/sys-ekwa', '#systemTitle', '#sec-system'],
  ['Planet sheet', './#system/sys-ekwa', '#systemTitle', '#planetSheet', openPlanet],
  ['System editor', './#systems', '#systemEditor', '#systemPanel', openEditor],
  ['Calculators', './#calculators', '#planHold', '#sec-calculators'],
  ['Guides', './#guides', '#guidesList a >> nth=0', '#sec-guides'],
  ['Book I (checklists)', './#book1', '#checklist-milestones input >> nth=0', '#sec-book1'],
  ['Book III (tables)', './#book3', '#sec-book3 table >> nth=0', '#sec-book3'],
  ['More', './#more', '#installRow', '#sec-more'],
  ['Ships & Multi-Tools', './#gear', '#sec-gear [data-gear] >> nth=0', '#sec-gear'],
  ['Gear editor', './#gear', '#gearEditor', '#gearEditor', openGearEditor],
  ['Notes', './#notes', '#notesList [data-note] >> nth=0', '#sec-notes'],
  ['Note editor', './#notes', '#noteEditor', '#noteEditor', openNoteEditor],
  ['Calculators, mid-plan', './#calculators', '#planHold', '#sec-calculators', tickHalf],
  ['Calculators, Registers', './#calculators', '#calcReg1', '#sec-calculators', openCamp],
  [
    'Calculators, Best crafts',
    './#calculators',
    '#craftList [data-craft] >> nth=0',
    '#sec-calculators',
    openBestCrafts
  ],
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
