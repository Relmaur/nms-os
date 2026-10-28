#!/usr/bin/env node
// ATLAS's MCP server over stdio (ADR-0008, docs/mcp.md): an MCP client (Claude Desktop, Claude Code, …) starts it on
// the player's computer. Stdout carries the protocol, so diagnostics go to stderr only, never the log's contents.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './tools.ts';
import { loadWiki, DEFAULT_WIKI_DIR } from './wiki.ts';
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

try {
  const wiki = await loadWiki(process.env.ATLAS_WIKI_DIR?.trim() || DEFAULT_WIKI_DIR);
  await createServer({ wiki, loadLog, ...(logSetupError ? { logSetupError } : {}) }).connect(
    new StdioServerTransport()
  );
} catch (err) {
  console.error('[atlas-mcp]', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
}
