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
  }
];
