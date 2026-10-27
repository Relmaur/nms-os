// Unit tests: the shared packages, the sync relay and repo checks run in Node; the web app's components (apps/web/vitest.config.ts)
// run in a simulated DOM.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['packages/*/test/**/*.test.ts', 'apps/sync/test/**/*.test.ts', 'tests/unit/**/*.test.mjs'],
          environment: 'node'
        }
      },
      'apps/web'
    ]
  }
});
