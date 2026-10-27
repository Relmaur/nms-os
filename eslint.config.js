// ESLint flat config. Rules catch real bugs (undefined names, unused code, unhandled promises, unsafe `any`), not
// style: Prettier owns formatting. TypeScript gets typescript-eslint's strictest type-aware rules (ADR-0004).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['**/node_modules/', 'wiki/offline-bundle.js', 'test-results/', 'playwright-report/', '**/dist/'] },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }] // storage access may throw in private mode; ignoring is deliberate
    }
  },
  {
    files: ['tests/**/*.mjs', '*.config.js', '**/*.config.ts', 'packages/wiki/**/*.ts'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } }
  },
  {
    // Callbacks passed to page.evaluate() run in the browser.
    files: ['tests/e2e/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  },
  {
    // ES modules: dependencies are explicit imports, so undefined names are real bugs.
    files: ['apps/web/src/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } }
  },
  ...tseslint.configs.strictTypeChecked.map(config => ({ ...config, files: ['**/*.{ts,tsx}'] })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      // Numbers in messages and template strings are the common, safe case.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }]
    }
  },
  {
    // Tests index fixtures they just wrote and read raw JSON files; a wrong guess fails the test anyway.
    files: ['packages/*/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off'
    }
  },
  {
    // Shared logic must run in the browser, in Node scripts and in a future API alike.
    files: ['packages/core/src/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['node:*'] }] }
  },
  { ...reactHooks.configs.flat.recommended, files: ['apps/web/src/**/*.tsx'] },
  {
    // Component tests render fixtures they just built; a wrong guess fails the test anyway.
    files: ['apps/web/src/**/*.test.tsx'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' }
  }
];
