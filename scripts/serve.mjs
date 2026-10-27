#!/usr/bin/env node
// Minimal static server for local development and the Playwright tests (no dependencies).
//
//   node scripts/serve.mjs [port]     serves the repository root, default port 3000
//
// ES modules need a real HTTP origin (they don't load over file://), and service workers need
// localhost or HTTPS, so this mirrors how GitHub Pages serves the site closely enough.

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    let file = path.join(ROOT, decodeURIComponent(pathname));
    // Never serve anything outside the repository root.
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) throw Object.assign(new Error('Forbidden'), { status: 403 });
    if ((await fs.stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch (err) {
    const status = err.status || (err.code === 'ENOENT' ? 404 : 500);
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(status === 404 ? 'Not found' : status === 403 ? 'Forbidden' : 'Server error');
  }
}).listen(PORT, () => console.log(`ATLAS // MASTER OS on http://localhost:${PORT}`));
