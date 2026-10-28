// The published package's game data: first download, daily revalidation by ETag, and never trading a good cache for
// a bad download. The "site" is the repo's own wiki indexes served by a fake fetch.
import { expect, test, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_WIKI_DIR, WIKI_FILES } from '../src/wiki.ts';
import { REFRESH_MS, loadRemoteWiki } from '../src/wiki-remote.ts';

const site = Object.fromEntries(
  await Promise.all(
    WIKI_FILES.map(async file => [file, await fs.readFile(path.join(DEFAULT_WIKI_DIR, file), 'utf8').catch(() => '{}')])
  )
) as Record<string, string>;

function fakeSite(overrides: Record<string, string> = {}, { down = false } = {}) {
  const seen: { file: string; ifNoneMatch: string | null }[] = [];
  const fetcher: typeof fetch = (input, init) => {
    if (down) return Promise.reject(new TypeError('fetch failed'));
    const file = path.basename(input instanceof Request ? input.url : String(input));
    const ifNoneMatch = new Headers(init?.headers).get('If-None-Match');
    seen.push({ file, ifNoneMatch });
    const body = overrides[file] ?? site[file] ?? '';
    const etag = `"${String(body.length)}"`;
    if (ifNoneMatch === etag) return Promise.resolve(new Response(null, { status: 304 }));
    return Promise.resolve(new Response(body, { headers: { ETag: etag } }));
  };
  return { fetcher, seen };
}

const tempDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'atlas-cache-'));

test('the first run downloads the indexes; later runs use the cache, revalidated once a day by ETag', async () => {
  const cacheDir = await tempDir();
  let now = Date.parse('2026-10-27T12:00:00Z');
  const first = fakeSite();
  const run1 = await loadRemoteWiki({ cacheDir, fetcher: first.fetcher, now: () => now });
  expect(run1.wiki.byTitle.get('oxygen')?.title).toBe('Oxygen');
  expect(run1.background).toBeNull();
  expect(first.seen.map(r => r.file).sort()).toEqual([...WIKI_FILES].sort());

  const again = fakeSite();
  const run2 = await loadRemoteWiki({ cacheDir, fetcher: again.fetcher, now: () => now });
  expect(run2.background).toBeNull();
  expect(again.seen).toEqual([]); // fresh enough: no request at all

  now += REFRESH_MS;
  const daily = fakeSite();
  const run3 = await loadRemoteWiki({ cacheDir, fetcher: daily.fetcher, now: () => now });
  await run3.background;
  expect(daily.seen.every(r => r.ifNoneMatch !== null)).toBe(true); // conditional: unchanged files cost a 304
  await fs.rm(cacheDir, { recursive: true });
});

test('a damaged download never replaces a good cache', async () => {
  const cacheDir = await tempDir();
  let now = Date.parse('2026-10-27T12:00:00Z');
  await loadRemoteWiki({ cacheDir, fetcher: fakeSite().fetcher, now: () => now });
  now += REFRESH_MS;
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const broken = fakeSite({ 'game-data.json': '{"schema": 99}' });
  const run = await loadRemoteWiki({ cacheDir, fetcher: broken.fetcher, now: () => now });
  await run.background;
  expect(error).toHaveBeenCalledWith(expect.stringContaining('wiki refresh failed'), expect.any(String));
  error.mockRestore();
  expect(await fs.readFile(path.join(cacheDir, 'game-data.json'), 'utf8')).toBe(site['game-data.json']);
  expect(run.wiki.catalog.pages).toBeGreaterThan(3000);
  await fs.rm(cacheDir, { recursive: true });
});

test('offline on the first run: a clear message, and nothing half-written', async () => {
  const cacheDir = await tempDir();
  await expect(loadRemoteWiki({ cacheDir, fetcher: fakeSite({}, { down: true }).fetcher })).rejects.toThrow(
    'couldn’t be downloaded'
  );
  expect(await fs.readdir(cacheDir)).toEqual([]);
  await fs.rm(cacheDir, { recursive: true });
});

test('a cached file its note wasn’t written with is downloaded whole, not trusted on a 304', async () => {
  const cacheDir = await tempDir();
  let now = Date.parse('2026-10-27T12:00:00Z');
  await loadRemoteWiki({ cacheDir, fetcher: fakeSite().fetcher, now: () => now });
  // Another process's copy landed after this one's note (the race two clients refreshing at once can make).
  await fs.appendFile(path.join(cacheDir, 'game-data.json'), '\n');
  now += REFRESH_MS;
  const daily = fakeSite();
  await (
    await loadRemoteWiki({ cacheDir, fetcher: daily.fetcher, now: () => now })
  ).background;
  expect(daily.seen.find(r => r.file === 'game-data.json')?.ifNoneMatch).toBeNull();
  expect(daily.seen.find(r => r.file === 'facts.json')?.ifNoneMatch).not.toBeNull();
  expect(await fs.readFile(path.join(cacheDir, 'game-data.json'), 'utf8')).toBe(site['game-data.json']);
  await fs.rm(cacheDir, { recursive: true });
});
