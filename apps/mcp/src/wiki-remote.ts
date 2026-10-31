// The published package's game data (ADR-0008): the wiki indexes the live site serves, downloaded once into the
// computer's cache folder and checked against the site at most once a day. Only these public files are fetched;
// nothing about the player goes with the request. A download replaces the cache only if it parses as a whole.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { WIKI_FILES, WikiMissing, parseWiki, type Wiki, type WikiFile, type WikiTexts } from './wiki.ts';

export const SITE_WIKI = 'https://atlas-os.cloud/app/wiki/';
export const REFRESH_MS = 24 * 3_600_000;
const TIMEOUT_MS = 60_000; // the Codex bundle is ~7 MB
const MAX_FILE_BYTES = 64 * 1024 * 1024;

const MetaSchema = z.object({
  checkedAt: z.number(),
  // Each file's validators, and its length: a note only vouches for the file it was written with.
  files: z.record(
    z.string(),
    z.object({ etag: z.string().optional(), lastModified: z.string().optional(), length: z.int().optional() })
  )
});
type Meta = z.infer<typeof MetaSchema>;

// ~/Library/Caches on macOS, %LOCALAPPDATA% on Windows, $XDG_CACHE_HOME or ~/.cache elsewhere.
export function defaultCacheDir(env: Record<string, string | undefined> = process.env): string {
  const chosen = env.ATLAS_CACHE_DIR?.trim();
  if (chosen) return path.resolve(chosen);
  const home = os.homedir();
  const base =
    process.platform === 'darwin'
      ? path.join(home, 'Library', 'Caches')
      : process.platform === 'win32'
        ? (env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'))
        : (env.XDG_CACHE_HOME ?? path.join(home, '.cache'));
  return path.join(base, 'nms-atlas-mcp');
}

interface Options {
  cacheDir: string;
  base?: string;
  fetcher?: typeof fetch;
  now?: () => number;
}

async function readCache(dir: string): Promise<{ texts: Partial<Record<WikiFile, string>>; meta: Meta | null }> {
  // Temporary files a killed process left behind (a live one renames its own within seconds).
  for (const name of await fs.readdir(dir).catch(() => [])) {
    const file = path.join(dir, name);
    const age = name.endsWith('.tmp')
      ? Date.now() - ((await fs.stat(file).catch(() => null))?.mtimeMs ?? Date.now())
      : 0;
    if (age > 3_600_000) await fs.rm(file, { force: true }).catch(() => undefined);
  }
  const texts: Partial<Record<WikiFile, string>> = {};
  for (const file of WIKI_FILES) {
    const text = await fs.readFile(path.join(dir, file), 'utf8').catch(() => undefined);
    if (text !== undefined) texts[file] = text;
  }
  const raw = await fs.readFile(path.join(dir, 'meta.json'), 'utf8').catch(() => 'null');
  let meta: Meta | null;
  try {
    meta = MetaSchema.safeParse(JSON.parse(raw)).data ?? null;
  } catch {
    meta = null; // a damaged note: download everything again
  }
  return { texts, meta };
}

const complete = (texts: Partial<Record<WikiFile, string>>): WikiTexts | null => {
  const bundle = texts['offline-bundle.js'];
  const data = texts['game-data.json'];
  return bundle === undefined || data === undefined
    ? null
    : { ...texts, 'offline-bundle.js': bundle, 'game-data.json': data };
};

// Through a temporary name, so a reader never sees half a file.
async function writeAtomic(target: string, text: string): Promise<void> {
  const temp = `${target}.${String(process.pid)}.tmp`;
  await fs.writeFile(temp, text, 'utf8');
  await fs.rename(temp, target);
}

// The body, refused once it passes the cap. Counted as it arrives: a compressed or chunked response's
// Content-Length doesn't say how much text it holds.
async function readCapped(response: Response, file: string): Promise<string> {
  if (!response.body) return '';
  // Fetch bodies yield bytes; the DOM-less lib types leave the chunks untyped.
  const reader = response.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_FILE_BYTES) {
      await reader.cancel();
      throw new Error(`${file} is too large`);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

// Fetches what changed since the cached copy (a 304 costs nothing), checks the whole set parses, then writes it:
// each file through a temporary name, so an interrupted write never leaves a half file in place.
async function refresh(
  { cacheDir, base = SITE_WIKI, fetcher = fetch, now = Date.now }: Options,
  cached: Partial<Record<WikiFile, string>>,
  meta: Meta | null
): Promise<WikiTexts> {
  const next: Partial<Record<WikiFile, string>> = { ...cached };
  const files: Meta['files'] = { ...meta?.files };
  for (const file of WIKI_FILES) {
    const note = meta?.files[file];
    // Revalidate only a file the note was written with; anything else (another process's file, a damaged one) is
    // downloaded whole.
    const have = cached[file];
    const known = have !== undefined && note?.length === have.length ? note : undefined;
    const headers: Record<string, string> = { 'User-Agent': 'nms-atlas-mcp' };
    if (known?.etag) headers['If-None-Match'] = known.etag;
    if (known?.lastModified) headers['If-Modified-Since'] = known.lastModified;
    const response = await fetcher(new URL(file, base), { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (response.status === 304) continue;
    if (!response.ok) {
      if (file === 'facts.json' || file === 'verification.json') continue; // optional: the tools work without them
      throw new Error(`${file}: HTTP ${String(response.status)}`);
    }
    next[file] = await readCapped(response, file);
    files[file] = {
      length: next[file].length,
      ...(response.headers.get('ETag') ? { etag: response.headers.get('ETag') ?? '' } : {}),
      ...(response.headers.get('Last-Modified') ? { lastModified: response.headers.get('Last-Modified') ?? '' } : {})
    };
  }
  const texts = complete(next);
  if (!texts) throw new Error('the site is missing the wiki indexes');
  parseWiki(texts); // throws on a damaged or unexpected download: the cache stays as it was
  await fs.mkdir(cacheDir, { recursive: true });
  for (const file of WIKI_FILES) {
    const text = next[file];
    if (text === undefined || text === cached[file]) continue;
    await writeAtomic(path.join(cacheDir, file), text);
  }
  for (const file of WIKI_FILES) {
    const text = next[file];
    if (text !== undefined && files[file]) files[file].length = text.length; // unchanged files keep their note
  }
  await writeAtomic(path.join(cacheDir, 'meta.json'), JSON.stringify({ checkedAt: now(), files }));
  return texts;
}

// The game data for this run: the cached copy when there is one (checked against the site in the background once
// it's a day old, for the next run), otherwise a first download now.
export async function loadRemoteWiki(options: Options): Promise<{ wiki: Wiki; background: Promise<void> | null }> {
  const now = options.now ?? Date.now;
  const { texts, meta } = await readCache(options.cacheDir);
  const cached = complete(texts);
  if (cached) {
    try {
      const wiki = parseWiki(cached);
      const due = !meta || now() - meta.checkedAt >= REFRESH_MS;
      const background = due
        ? refresh(options, texts, meta).then(
            () => undefined,
            (err: unknown) => {
              console.error('[atlas-mcp] wiki refresh failed; keeping the cached copy:', String(err));
            }
          )
        : null;
      return { wiki, background };
    } catch {
      // A damaged cache: download a fresh one below, as on a first run.
    }
  }
  try {
    return { wiki: parseWiki(await refresh(options, {}, null)), background: null };
  } catch (err) {
    // Another process may have written the same first copy at the same moment (Windows refuses a rename onto a file
    // in use): its copy serves.
    const again = complete((await readCache(options.cacheDir)).texts);
    if (again)
      try {
        return { wiki: parseWiki(again), background: null };
      } catch {
        // fall through to the message
      }
    throw new WikiMissing(
      `The game data couldn’t be downloaded from ${options.base ?? SITE_WIKI} (${err instanceof Error ? err.message : String(err)}). Check the connection and restart; your log’s tools still work.`
    );
  }
}
