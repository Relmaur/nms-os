// Unit tests for the shared packages (and, until ADR-0004 step 3, the remaining checks on the vanilla UI).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'tests/unit/**/*.test.mjs'],
    environment: 'node'
  }
});
