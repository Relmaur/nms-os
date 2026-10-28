// The published package's build (ADR-0008): src/main.ts as one Node ES module, with @atlas/core inlined (Node can't
// strip types inside node_modules) and the SDK and Zod left as the package's pinned dependencies.
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'src/main.ts',
    outDir: 'dist',
    target: 'node22',
    minify: false, // a player can read what runs on their computer
    rolldownOptions: {
      external: [/^@modelcontextprotocol\/sdk/, 'zod', /^node:/],
      output: { entryFileNames: 'main.js', format: 'es' }
    }
  },
  ssr: { noExternal: ['@atlas/core'] }
});
