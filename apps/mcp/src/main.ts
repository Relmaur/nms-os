#!/usr/bin/env node
// ATLAS's MCP server over stdio (ADR-0008, docs/mcp.md): an MCP client (Claude Desktop, Claude Code, …) starts it on
// the player's computer. Stdout carries the protocol, so diagnostics go to stderr only, never the log's contents.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './tools.ts';
import { loadWiki, DEFAULT_WIKI_DIR, RUNNING_FROM_SOURCE, type Wiki } from './wiki.ts';
import { defaultCacheDir, loadRemoteWiki } from './wiki-remote.ts';
import { LogError, logSourceFromEnv, makeLogLoader } from './log.ts';

let loadLog: ReturnType<typeof makeLogLoader> | null = null;
let logSetupError: string | undefined;
try {
  const source = logSourceFromEnv(process.env);
  loadLog = source && makeLogLoader(source);
} catch (err) {
  // Still serve the game tools; the player tools say what's wrong with the configuration.
  logSetupError = err instanceof LogError ? err.message : 'The ATLAS log configuration couldn’t be read.';
}

// Game data: a folder the player names, else the repo's own mirror when running from a clone, else the live site's
// copy, cached on this computer (the published package).
const dir = process.env.ATLAS_WIKI_DIR?.trim();
const gameData = async (): Promise<Wiki> => {
  if (dir) return loadWiki(dir);
  if (RUNNING_FROM_SOURCE) {
    try {
      return await loadWiki(DEFAULT_WIKI_DIR);
    } catch {
      // A clone without `pnpm index:wiki`: the live site's copy serves instead.
    }
  }
  return (await loadRemoteWiki({ cacheDir: defaultCacheDir() })).wiki;
};
const wiki = gameData();
wiki.catch((err: unknown) => {
  console.error('[atlas-mcp]', err instanceof Error ? err.message : String(err));
});

// Connected before the game data is ready, so a first download never holds up the client's start.
try {
  await createServer({
    loadWiki: () => wiki.catch(() => gameData()), // a failed first load is retried when a tool needs it
    loadLog,
    ...(logSetupError ? { logSetupError } : {})
  }).connect(new StdioServerTransport());
} catch (err) {
  console.error('[atlas-mcp]', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
