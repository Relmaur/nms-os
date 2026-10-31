// Builds the two pages (the app and the Codex) with relative URLs, since the app lives in a subfolder: /app/ on
// atlas-os.cloud (`pnpm build`, into dist-site/app) and /nms-os/ on GitHub Pages (plain `vite build`, into dist). public/wiki is a symlink to the repo's wiki mirror, copied into the build as-is.
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// A Content Security Policy for both built pages: everything comes from the site itself, except the sync relay it
// talks to, when that's on another origin; no inline or injected scripts, styles, frames or plugins. Build only: the
// dev server injects inline styles. (frame-ancestors can't be set from a meta tag: apps/site/_headers sets it.)
function contentSecurityPolicy(relay: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self'${relay.startsWith('http') ? ` ${new URL(relay).origin}` : ''}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'"
  ].join('; ');
  return {
    name: 'atlas-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }
    ]
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    contentSecurityPolicy(loadEnv(mode, import.meta.dirname, 'VITE_').VITE_SYNC_URL ?? ''),
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/sw',
      filename: 'sw.ts',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        globPatterns: [
          '**/*.{html,js,css,webmanifest}',
          'assets/icons/*',
          '**/*-{latin,greek}-*.woff2', // with -ext; Greek too, for names like "Aeron-ημ"
          'assets/Phosphor*.woff2',
          'wiki/*.json'
        ],
        globIgnores: ['wiki/verification.json', 'wiki/custom/**'], // woff2 is enough: skip Phosphor's SVG/TTF fallbacks
        // The Codex's full-text bundle is ~7 MB and the dataset ~2.5 MB; both are needed offline.
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024
      }
    })
  ],
  build: {
    rolldownOptions: { input: { main: 'index.html', codex: 'wiki/index.html' } }
  }
}));
