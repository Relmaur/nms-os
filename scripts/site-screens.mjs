// Takes the product page's phone screens from the real app, with an invented log: tall WebP screenshots at 2× and 3×,
// and their heights for the page (apps/site/public/screens). Run by hand when the screens change, then commit them:
//   pnpm --filter @atlas/web build --mode e2e && node scripts/site-screens.mjs
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const PORT = 4191;
const OUT = new URL('../apps/site/public/screens/', import.meta.url).pathname;
const HOUR = 3_600_000;
const now = Date.now();
const ago = hours => new Date(now - hours * HOUR).toISOString();
const ahead = minutes => new Date(now + minutes * 60_000).toISOString();

// Everything here is invented: names a player might give, and nobody's own log.
const here = {
  id: 'vintam',
  name: 'Vintam Reach',
  galaxy: 'Euclid',
  region: 'Oshaun Sector',
  glyphs: '0A2F01C93B7E',
  star: 'yellow',
  race: 'korvax',
  economy: 'Technology',
  wealth: 2,
  conflict: 'medium',
  rating: 5,
  planetCount: 5,
  favorite: true,
  planets: [
    { id: 'p1', name: 'Ekora Prime', biome: 'Lush', notes: 'Paradise. Built the first base here.', tags: ['Base'] },
    { id: 'p2', name: 'Tessa Minor', biome: 'Scorched' },
    { id: 'p3', name: 'Oran IX', biome: 'Toxic' },
    { id: 'p4', name: 'Hale 24', biome: 'Frozen' },
    { id: 'p5', name: 'Geris Beta', biome: 'Exotic' }
  ],
  visits: [
    { at: ago(0.7), note: 'Back for the base. Refiners running.' },
    { at: ago(26), note: 'Found a Sentinel pillar on Oran IX.' },
    { at: ago(190), note: 'First warp out here. Keeping this one.' }
  ],
  createdAt: ago(190)
};
const others = [
  ['Asoru Drift', 'blue', 'gek', 'Trading'],
  ['Halden Cross', 'red', 'vykeen', 'Mining'],
  ['Irrin Basin', 'green', 'korvax', 'Scientific'],
  ['Nolvek Span', 'yellow', 'gek', 'Manufacturing'],
  ['Tharsis Gate', 'purple', 'vykeen', 'Power Generation']
].map(([name, star, race, economy], i) => ({
  id: `s${String(i)}`,
  name,
  galaxy: 'Euclid',
  region: 'Oshaun Sector',
  glyphs: `0${(0x4b1 + i * 37).toString(16).toUpperCase()}01C9${(0x3b7 + i * 91).toString(16).toUpperCase()}E`.padEnd(
    12,
    '0'
  ),
  star,
  race,
  economy,
  planetCount: 2 + i,
  visits: [{ at: ago(40 + i * 30) }],
  createdAt: ago(40 + i * 30)
}));
const state = {
  systems: [here, ...others],
  session: { startedAt: ago(1.2), timersDone: 2 },
  timers: [
    { id: 't1', kind: 'refine', label: '300 Chromatic Metal', startedAt: ago(0.4), endsAt: ahead(18), alerted: false },
    { id: 't2', kind: 'crop', label: 'Frost Crystal', startedAt: ago(0.2), endsAt: ahead(42), alerted: false }
  ]
};

const SCREENS = { home: '#home', system: '#system/vintam', timers: '#session', planner: '#plan/Stasis%20Device' };

const server = spawn('pnpm', ['--filter', '@atlas/web', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: true
});
const browser = await chromium.launch();
const sizes = {};
const work = mkdtempSync(join(tmpdir(), 'atlas-screens-'));
mkdirSync(OUT, { recursive: true });
try {
  for (let tries = 0; tries < 40; tries++) {
    if (
      await fetch(`http://localhost:${String(PORT)}/`).then(
        r => r.ok,
        () => false
      )
    )
      break;
    await new Promise(done => setTimeout(done, 250));
  }
  for (const scale of [2, 3]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: scale,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce', // a settled picture, not a frame of an animation
      serviceWorkers: 'block'
    });
    await context.addInitScript(saved => {
      if (!localStorage.getItem('nms_master_os_state')) localStorage.setItem('nms_master_os_state', saved);
    }, JSON.stringify(state));
    const page = await context.newPage();
    for (const [name, hash] of Object.entries(SCREENS)) {
      await page.goto('about:blank'); // a real load: a change of hash alone would keep the last shot's changes
      await page.goto(`http://localhost:${String(PORT)}/${hash}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      // A tall picture of a phone's screen: what's fixed below the fold stays hidden, and the tab bar sits at the end.
      await page.evaluate(() => {
        const tall = document.documentElement.scrollHeight;
        for (const el of document.querySelectorAll('body *')) {
          if (getComputedStyle(el).position !== 'fixed') continue;
          const box = el.getBoundingClientRect();
          if (box.top >= innerHeight) el.style.visibility = 'hidden';
          else if (box.top > innerHeight * 0.7) el.style.transform = `translateY(${String(tall - innerHeight)}px)`;
        }
      });
      const shot = join(work, `${name}-${String(scale)}x.png`);
      await page.screenshot({ path: shot, fullPage: true });
      sizes[name] = await page.evaluate(() => document.documentElement.scrollHeight);
      execFileSync('ffmpeg', [
        '-y',
        '-loglevel',
        'error',
        '-i',
        shot,
        '-c:v',
        'libwebp',
        '-quality',
        '82',
        join(OUT, `${name}-${String(scale)}x.webp`)
      ]);
    }
    await context.close();
  }
  writeFileSync(join(OUT, 'sizes.json'), `${JSON.stringify(sizes, null, 2)}\n`);
  console.log(sizes);
} finally {
  await browser.close();
  process.kill(-server.pid);
  rmSync(work, { recursive: true, force: true });
}
