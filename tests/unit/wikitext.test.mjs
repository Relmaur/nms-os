// scripts/lib/wikitext.mjs against real page sources (tests/fixtures/wikitext/, CC BY-SA 3.0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildArticle,
  parseTemplate,
  renderWikitext,
  plainText,
  toFrontmatter,
  parseFrontmatter,
  categoryFor,
  slugify
} from '../../scripts/lib/wikitext.mjs';

const FIXTURES = new URL('../fixtures/wikitext/', import.meta.url);
const pages = JSON.parse(fs.readFileSync(new URL('pages.json', FIXTURES), 'utf8'));
const article = slug =>
  buildArticle({ ...pages[slug], content: fs.readFileSync(new URL(`${slug}.wiki`, FIXTURES), 'utf8') });

test('Oxygen: infobox facts, refiner recipes and the in-game description', () => {
  const { category, meta, body } = article('oxygen');
  assert.equal(category, 'resources');
  assert.equal(meta.revId, 1335140);
  assert.equal(meta.version, 'Waypoint');
  assert.equal(meta.data.value, 34);
  assert.equal(meta.data.fields.symbol, 'O2');
  assert.equal(
    meta.summary,
    'Integral to the atmospheric filtering technology at the heart of the exosuit life support system.'
  );
  const refine = meta.data.recipes.filter(recipe => recipe.type === 'refine');
  assert.equal(refine.length, 9);
  assert.deepEqual(refine[1], {
    type: 'refine',
    inputs: [
      { name: 'Kelp Sac', qty: 1 },
      { name: 'Carbon', qty: 1 }
    ],
    outputs: [{ name: 'Oxygen', qty: 2 }],
    seconds: 0.36,
    label: 'Release Captured Oxygen'
  });
  assert.match(body, /^\*\*Oxygen\*\* is a resource\.$/m, 'bold at the start of a line is not a list item');
  assert.match(body, /\[\[Life Support\|life support\]\]/);
});

test('Stasis Device: blueprint craft recipe, value and a multi-line table', () => {
  const { meta, body } = article('stasis-device');
  assert.equal(meta.data.value, 15600000);
  assert.deepEqual(meta.data.recipes, [
    {
      type: 'craft',
      inputs: [
        { name: 'Quantum Processor', qty: 1 },
        { name: 'Cryogenic Chamber', qty: 1 },
        { name: 'Iridesite', qty: 1 }
      ],
      outputs: [{ name: 'Stasis Device', qty: 1 }],
      blueprint: true
    }
  ]);
  assert.match(body, /^\| Cryogenic Chamber \| Quantum Processor \| Iridesite \|$/m);
  assert.match(body, /• 250 \[\[Radon\]\]/);
});

test('Craft output quantity: a Bionic Lure craft yields 20', () => {
  const [craft] = article('bionic-lure').meta.data.recipes.filter(recipe => recipe.type === 'craft');
  assert.deepEqual(craft.outputs, [{ name: 'Bionic Lure', qty: 20 }]);
  assert.deepEqual(
    craft.inputs.map(input => input.name),
    ['Amino Chamber', 'Ion Battery', 'Lubricant']
  );
});

test('cooking recipes keep self-multiplying entries as data (the planner skips them)', () => {
  const recipes = article('wild-yeast').meta.data.recipes;
  assert.deepEqual(
    recipes.map(recipe => recipe.inputs[0].name),
    ['Wild Yeast', 'Faecium']
  );
  assert.ok(recipes.every(recipe => recipe.type === 'cook' && recipe.seconds === 2.5));
});

test('repair and dismantle recipes, and nested tables leave no raw markup', () => {
  const { meta, body } = article('analysis-visor-upgrade');
  assert.deepEqual(
    meta.data.recipes.map(recipe => recipe.type),
    ['repair', 'dismantle']
  );
  assert.doesNotMatch(body, /^\s*(\{\||\|\})/m);
  assert.doesNotMatch(body, /\[\[:?File:/);
});

test('archived variants are obsolete; player-found multi-tools are excluded', () => {
  const atlas = article('blaze-javelin-atlas');
  assert.equal(atlas.meta.obsolete, true);
  assert.equal(atlas.meta.data.recipes[0].obsolete, true);
  assert.deepEqual(article('player-found-multitool'), { excluded: 'player-found multi-tool' });
});

test('templates parse positional, numbered and named parameters with nesting', () => {
  const template = parseTemplate('Craft|1=Oxygen,150;Silver,60|blueprint=yes|{{Units}}|[[A|B]]');
  assert.equal(template.key, 'craft');
  assert.deepEqual(template.positional, ['Oxygen,150;Silver,60', '{{Units}}', '[[A|B]]']);
  assert.deepEqual(template.named, { blueprint: 'yes' });
});

test('inline markup renders to Markdown and plain text', () => {
  const md = renderWikitext("==Heading==\n* '''Bold''' and ''italic'' [[Target|label]]\n{{Units}}", { title: 'X' });
  assert.equal(md, '## Heading\n\n- **Bold** and *italic* [[Target|label]]\n Units');
  assert.equal(plainText('[[Sodium Nitrate|Sodium]]<br>{{link|Gold}} &amp; more'), 'Sodium, Gold & more');
});

test('frontmatter round-trips strings, numbers, booleans and data objects', () => {
  const meta = { title: 'A "quoted" title', revId: 5, obsolete: false, data: { recipes: [{ type: 'craft' }] } };
  assert.deepEqual(parseFrontmatter(toFrontmatter(meta) + 'body').meta, meta);
});

test('category folders and slugs follow the infobox', () => {
  assert.equal(categoryFor('product', { category: 'Fish' }), 'fish');
  assert.equal(categoryFor('product', { type: 'Edible Product' }), 'cooking');
  assert.equal(categoryFor('product', { category: 'Base Building' }), 'building');
  assert.equal(categoryFor('product', { category: 'Tradeable' }), 'products');
  assert.equal(categoryFor('encounter', {}), 'places');
  assert.equal(slugify("'Apple' Cake of Lost Souls"), 'Apple_Cake_of_Lost_Souls');
});
