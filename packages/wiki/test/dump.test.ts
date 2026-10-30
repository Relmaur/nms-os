// dump.ts and discover.ts against a tiny MediaWiki XML dump, plain and gzipped.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { InvalidDump, decodeXml, followRedirect, normalizeTitle, parsePage, readDump, scanDump, scopeKind } from '../src/dump.ts';
import { categoryVerdict, collector, discover, infoboxVerdict, reportMarkdown } from '../src/discover.ts';

const page = (id: number, title: string, text: string, { ns = 0, rev = id * 10, at = '2026-10-20T10:00:00Z', redirect = '' } = {}) => `
  <page>
    <title>${title}</title>
    <ns>${String(ns)}</ns>
    <id>${String(id)}</id>${redirect ? `\n    <redirect title="${redirect}" />` : ''}
    <revision>
      <id>${String(rev)}</id>
      <parentid>${String(rev - 1)}</parentid>
      <timestamp>${at}</timestamp>
      <contributor><username>Someone</username><id>777</id></contributor>
      <model>wikitext</model>
      <format>text/x-wiki</format>
      <text bytes="${String(text.length)}" xml:space="preserve">${text}</text>
      <sha1>x</sha1>
    </revision>
  </page>`;

const site = (base = 'https://nomanssky.fandom.com/wiki/No_Man%27s_Sky_Wiki') => `<mediawiki xmlns="http://www.mediawiki.org/xml/export-0.11/" version="0.11" xml:lang="en">
  <siteinfo>
    <sitename>No Man's Sky Wiki</sitename>
    <base>${base}</base>
  </siteinfo>`;

const DUMP = [
  site(),
  page(1, 'Oxygen', '{{Resource infobox\n| name = Oxygen\n}}\n&lt;b&gt;Oxygen&lt;/b&gt; is a resource &amp; more.', { at: '2026-10-28T21:12:00Z' }),
  page(2, 'Rigogen', '#REDIRECT [[Oxygen#Uses]]', { redirect: 'Oxygen#Uses' }),
  page(3, 'Biome', 'Lush worlds are…\n[[Category:Mechanics]]'),
  page(4, 'Talk:Oxygen', '{{Resource infobox}}', { ns: 1 }),
  page(5, 'Frigid Planet XYZ', '{{Planet infobox\n| discovered = Someone\n| civilized = Hub\n}}\n[[Category:Planets]]'),
  page(6, 'Paradise Planet', '{{Planet infobox\n| type = Paradise\n}}'),
  page(7, 'Gek', 'The Gek are a race.\n[[Category:Races]]'),
  page(8, 'Old Rigogen', '', { redirect: 'Rigogen' }),
  '</mediawiki>'
].join('\n');

function write(name: string, text: string | Buffer): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-dump-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, text);
  return file;
}

test('XML entities decode once: the wikitext keeps its own', () => {
  assert.equal(decodeXml('&lt;b&gt; &amp;nbsp; &quot;x&quot; &#039;y&#x27;'), '<b> &nbsp; "x" \'y\'');
});

test('a page: ids, the revision (not the contributor) and its text; a redirect keeps its target', () => {
  const oxygen = parsePage(page(1, 'Oxygen', 'a &amp; b').replace(/^\s*<page>|<\/page>\s*$/g, ''));
  assert.deepEqual(oxygen, {
    pageId: 1,
    title: 'Oxygen',
    ns: 0,
    redirect: null,
    revId: 10,
    revTimestamp: '2026-10-20T10:00:00Z',
    content: 'a & b'
  });
  assert.equal(parsePage(page(2, 'R', '#REDIRECT', { redirect: 'Oxygen' })).redirect, 'Oxygen');
  assert.equal(parsePage(page(9, 'Hidden', '').replace(/<text[^]*<\/text>/, '<text bytes="0" deleted="deleted" />')).content, '');
  assert.throws(() => parsePage('<title>Broken</title><ns>0</ns>'), InvalidDump);
});

test('reads a plain or gzipped dump, and refuses another wiki or a 7z', async () => {
  const titles = async (file: string) => {
    const out: string[] = [];
    for await (const item of readDump(file)) out.push(item.title);
    return out;
  };
  const plain = await titles(write('nms.xml', DUMP));
  assert.equal(plain.length, 8);
  assert.deepEqual(await titles(write('nms.xml.gz', zlib.gzipSync(DUMP))), plain);
  const http = DUMP.replace(site(), site('http://nomanssky.fandom.com/wiki/No_Man%27s_Sky_Wiki')); // as Fandom writes it
  assert.deepEqual(await titles(write('http.xml', http)), plain);
  await assert.rejects(titles(write('other.xml', DUMP.replace(site(), site('https://other.fandom.com/wiki/Main')))), /not https:\/\/nomanssky/);
  await assert.rejects(titles(write('nms.7z', 'x')), /extract the \.xml first/);
});

test('scope: main-namespace pages with a game-data infobox, plus the mechanics pages by title', () => {
  const base = { ns: 0, redirect: null };
  assert.equal(scopeKind({ ...base, title: 'Oxygen', content: '{{Resource infobox|name=Oxygen}}' }), 'resource');
  assert.equal(scopeKind({ ...base, title: 'X', content: '{{resource_infobox}}' }), 'resource');
  assert.equal(scopeKind({ ...base, title: 'X', content: '{{Product infobox}}{{Resource infobox}}' }), 'resource'); // SCOPE order
  assert.equal(scopeKind({ ...base, title: 'Biome', content: 'prose' }), 'mechanic');
  assert.equal(scopeKind({ ...base, ns: 1, title: 'Talk:X', content: '{{Resource infobox}}' }), null);
  assert.equal(scopeKind({ ...base, redirect: 'Oxygen', title: 'X', content: '{{Resource infobox}}' }), null);
  assert.equal(scopeKind({ ...base, title: 'Planet', content: '{{Planet infobox}}' }), null);
});

test('a scan keeps the pages in scope, the redirects and the newest revision', async () => {
  const scan = await scanDump(write('nms.xml', DUMP));
  assert.deepEqual(
    scan.pages.map(item => [item.title, item.kind]),
    [
      ['Oxygen', 'resource'],
      ['Biome', 'mechanic']
    ]
  );
  assert.equal(scan.pages[0]?.content.includes('<b>Oxygen</b> is a resource & more.'), true);
  assert.equal(scan.latest, '2026-10-28T21:12:00Z');
  assert.equal(followRedirect(scan.redirects, 'old_Rigogen'), 'Oxygen'); // two hops, section dropped
  assert.equal(followRedirect(scan.redirects, 'Oxygen'), null);
  assert.ok(scan.mechanicsMissing.includes('Inventory'));
  assert.equal(normalizeTitle(' multi_tool  slots '), 'Multi tool slots');
});

test('discover: infoboxes with counts, samples and discovery fields; large categories of pages without one', async () => {
  const report = await discover(write('nms.xml', DUMP));
  assert.equal(report.articles, 5);
  assert.equal(report.redirects, 2);
  const planet = report.infoboxes.find(row => row.name === 'Planet infobox');
  assert.deepEqual(planet && [planet.pages, planet.samples, planet.discoveryFields, planet.verdict], [
    2,
    ['Frigid Planet XYZ', 'Paradise Planet'],
    { discovered: 1, civilized: 1 },
    'mixed'
  ]);
  assert.equal(report.infoboxes.find(row => row.name === 'Resource infobox')?.inScope, 1);
  assert.deepEqual(report.categories, []); // none past the threshold in a tiny dump

  const tallies = collector();
  for (let i = 0; i < 25; i++)
    tallies.add({ pageId: 100 + i, title: `Race ${String(i)}`, ns: 0, redirect: null, revId: 1, revTimestamp: '2026-01-01T00:00:00Z', content: '[[Category:Races]]' });
  assert.deepEqual(
    tallies.report().categories.map(row => [row.name, row.pages, row.verdict]),
    [['Races', 25, 'review']]
  );
  const markdown = reportMarkdown(report, 'nms.xml');
  assert.match(markdown, /\| Planet infobox \| 2 \| 0 \| discovered 1, civilized 1 \| \*\*mixed\*\* \|/);
});

test('verdicts: nearly all filled is community, some is mixed, none is game unless the name says otherwise', () => {
  assert.equal(infoboxVerdict('Creature infobox', 100, { discovered: 95 })[0], 'community');
  assert.equal(infoboxVerdict('Starship infobox', 100, { discovered: 30 })[0], 'mixed');
  assert.equal(infoboxVerdict('Resource infobox', 100, {})[0], 'game');
  assert.equal(infoboxVerdict('Civilization infobox', 100, {})[0], 'community');
  assert.equal(categoryVerdict('AGT Galactic Archives')[0], 'community');
  assert.equal(categoryVerdict('InExCor')[0], 'review'); // no infobox and an unknown name: a person decides
});
