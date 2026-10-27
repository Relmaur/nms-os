// ESLint flat config. Rules catch real bugs (undefined names, unused code, unhandled promises, unsafe `any`), not
// style: Prettier owns formatting. TypeScript gets typescript-eslint's strictest type-aware rules (ADR-0004).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', '*.config.js', '*.config.ts', 'packages/wiki/**/*.ts'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } }
  },
  {
    // Callbacks passed to page.evaluate() run in the browser.
    files: ['tests/e2e/**/*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  },
  {
    files: ['sw.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: { ...globals.serviceworker } }
  },
  {
    // ES modules: dependencies are explicit imports, so undefined names are real bugs.
    files: ['assets/lib/**/*.js', 'assets/app/**/*.js', 'wiki/codex.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } }
  },
  {
    // The Codex page loads these from the CDN (see CDN_PRECACHE in sw.js).
    files: ['wiki/codex.js'],
    languageOptions: { globals: { marked: 'readonly', DOMPurify: 'readonly' } }
  },
  {
    // The two remaining classic scripts: the Tailwind CDN config and the service-worker registration.
    files: ['assets/theme.js', 'assets/pwa.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: { ...globals.browser, tailwind: 'writable' }
    }
  },
  ...tseslint.configs.strictTypeChecked.map(config => ({ ...config, files: ['**/*.ts'] })),
  {
    files: ['**/*.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      // Numbers in messages and template strings are the common, safe case.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }]
    }
  },
  {
    // Tests index fixtures they just wrote; a wrong guess fails the test anyway.
    files: ['packages/*/test/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' }
  },
  {
    // Shared logic must run in the browser, in Node scripts and in a future API alike.
    files: ['packages/core/src/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['node:*'] }] }
  }
];
