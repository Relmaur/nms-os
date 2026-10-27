// Shared Playwright setup: a seeded save (never the real one) and a page that fails the test on any
// uncaught error or console error.
import { test as base, expect } from '@playwright/test';

export const STORAGE_KEY = 'nms_master_os_state';
const minutesAgo = minutes => new Date(Date.now() - minutes * 60000).toISOString();

// lastUpdated is far in the future so this copy wins over the repo's nms_state.json.
export function seedState() {
  return {
    meta: { version: '2.0.0', lastUpdated: '2099-01-01T00:00:00.000Z', currentPhase: 'Phase 3: Test run' },
    outlaw: { restockHours: 24, packetsPerVisit: 15, runSize: 5, unitsPerPacket: 75000, nanitesPerPacket: 350 },
    systems: [
      {
        id: 'sys-ekwa',
        name: 'Ekwa Nexus',
        region: 'Odyalutai',
        galaxy: 'Euclid',
        glyphs: '0123456789AB',
        star: 'yellow',
        tags: ['trade-hub', 'base'],
        notes: 'S-class hauler spawns here',
        planets: [],
        visits: [{ at: minutesAgo(10) }],
        createdAt: '2026-10-20T00:00:00.000Z'
      },
      {
        id: 'sys-hesper',
        name: 'Hesper Drift',
        star: 'green',
        tags: ['to-revisit'],
        planets: [],
        visits: [{ at: minutesAgo(2 * 24 * 60) }],
        createdAt: '2026-10-21T00:00:00.000Z'
      },
      {
        id: 'sys-den',
        name: 'Outlaw Den',
        region: 'Pirate Reach',
        star: 'red',
        conflict: 'pirate',
        tags: ['outlaw'],
        planets: [],
        visits: [],
        createdAt: '2026-10-22T00:00:00.000Z'
      }
    ]
  };
}

export const test = base.extend({
  // Seed once per test; reloads keep whatever the app saved since (sessionStorage marks it done).
  seed: [seedState(), { option: true }],
  page: async ({ page, seed }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    await page.addInitScript(
      ([key, value]) => {
        if (sessionStorage.getItem('atlas-test-seeded')) return;
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
        sessionStorage.setItem('atlas-test-seeded', '1');
      },
      [STORAGE_KEY, seed ? JSON.stringify(seed) : '']
    );
    await use(page);
    expect(errors, 'no uncaught or console errors').toEqual([]);
  }
});

export { expect };

export async function storedState(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
}

// The layout must never scroll sideways (390px phones especially).
export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
}
