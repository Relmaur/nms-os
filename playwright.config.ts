// Browser tests on a desktop and a phone viewport, plus an offline run, against the built app served by
// `vite preview`: what users get, not the dev server. `pnpm test:e2e` builds first (in e2e mode: the same build with a test sync address, apps/web/.env.e2e).
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const phone = {
  ...devices['Desktop Chrome'],
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    // A service worker would serve cached files between tests and hide changes under test.
    serviceWorkers: 'block',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /offline\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    },
    { name: 'phone', testIgnore: /offline\.spec/, use: phone },
    // The one place the service worker runs: install, go offline, and the app must still work.
    { name: 'offline', testMatch: /offline\.spec/, use: { ...phone, serviceWorkers: 'allow' } }
  ],
  webServer: {
    command: `pnpm preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI
  }
});
