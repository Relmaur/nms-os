import AxeBuilder from '@axe-core/playwright';
import { test, expect, storedState } from './fixtures.mjs';

test('a run you make is checked against the wiki, estimated, and kept under Yours', async ({ page }) => {
  await page.goto('./#runs');
  await page.getByRole('button', { name: 'New run' }).click();
  const editor = page.getByRole('dialog', { name: 'New run' });
  await editor.getByRole('textbox', { name: 'Name' }).fill('Cryo-Pump loop');
  await editor.getByRole('button', { name: 'Add a step' }).click();
  await editor.getByRole('combobox', { name: 'Step 1: system' }).fill('Ekwa Nexus');
  await expect(editor.locator('#runSteps')).toContainText('your system');
  await editor.getByRole('button', { name: 'Add a step' }).click();
  await editor.getByRole('combobox', { name: 'Step 2 verb' }).selectOption('sell');
  await editor.getByRole('combobox', { name: 'Step 2: item' }).fill('Cryo-Pump');
  await editor.getByRole('spinbutton', { name: 'Sold' }).fill('2');
  // The wiki's value for a Cryo-Pump, from the mirror.
  await expect(editor.locator('#runSteps')).toContainText('1,500,000 Units each');
  await expect(editor.locator('#runEstimate')).toContainText('≈ 3,000,000');
  await expect(editor.locator('#runEstimate')).toContainText(/checked · v\d+\.\d+/);

  const { violations } = await new AxeBuilder({ page }).include('#runEditor').analyze();
  expect(violations.map(v => `${v.id}: ${v.help}`)).toEqual([]);

  await editor.getByRole('button', { name: 'Save run' }).click();
  await expect(editor).toBeHidden();
  await expect(page.locator('#runsYours')).toContainText('≈ 3.0M per run');
  await expect(page.locator('#runsYours')).toContainText(/Works in v\d+\.\d+/);
  const [run] = (await storedState(page)).runs;
  expect(run.steps.map(step => [step.verb, step.target, step.systemId])).toEqual([
    ['go', 'Ekwa Nexus', 'sys-ekwa'],
    ['sell', 'Cryo-Pump', '']
  ]);
  expect(run.checked.values).toEqual({ 'sell:Cryo-Pump': '1500000' });
});
