// The published package: the bundled dist/main.js (what `npx nms-atlas-mcp` runs) starts over stdio and serves
// every tool, with @atlas/core inlined and only the SDK and Zod left to install.
import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { DEFAULT_WIKI_DIR } from '../src/wiki.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the bundle starts, imports nothing but the SDK, Zod and Node, and lists every tool', async () => {
  const outDir = await fs.mkdtemp(path.join(ROOT, '.bundle-test-')); // inside the package, so the SDK resolves
  try {
    await build({ root: ROOT, logLevel: 'silent', build: { outDir, emptyOutDir: true } });
    const code = await fs.readFile(path.join(outDir, 'main.js'), 'utf8');
    expect(code.startsWith('#!/usr/bin/env node')).toBe(true);
    const imports = [...code.matchAll(/^import .* from "([^"]+)";$/gm)].map(match => match[1] ?? '');
    expect(imports.filter(spec => !/^(node:|@modelcontextprotocol\/sdk\/|zod$)/.test(spec))).toEqual([]);

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(outDir, 'main.js')],
      env: { PATH: process.env.PATH ?? '', HOME: os.homedir(), ATLAS_WIKI_DIR: DEFAULT_WIKI_DIR },
      stderr: 'pipe'
    });
    const client = new Client({ name: 'bundle-test', version: '1' });
    await client.connect(transport);
    expect((await client.listTools()).tools).toHaveLength(13);
    const result = await client.callTool({ name: 'search_codex', arguments: { query: 'oxygen', limit: 1 } });
    expect(JSON.stringify(result)).toContain('Oxygen');
    await client.close();
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
}, 60_000);
