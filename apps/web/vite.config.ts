// Builds the two pages (the app and the Codex) into dist/ with relative URLs, since GitHub Pages serves the site
// under /nms-os/. public/wiki is a symlink to the repo's wiki mirror, copied into the build as-is.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
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
});
