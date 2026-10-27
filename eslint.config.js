// ESLint flat config. Rules catch real bugs (undefined names, unused code, accidental globals), not style.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'wiki/offline-bundle.js', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }] // storage access may throw in private mode; ignoring is deliberate
    }
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', '*.config.js'],
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
    // Classic browser scripts share one global scope with the pages' inline scripts and call each
    // other's functions, so cross-file names look undefined and top-level functions look unused.
    // The ES-module refactor (ADR-0001) makes those dependencies explicit and removes this block.
    files: ['assets/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: { ...globals.browser, tailwind: 'writable' } },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': ['error', { vars: 'local', args: 'none', caughtErrors: 'none' }]
    }
  }
];
