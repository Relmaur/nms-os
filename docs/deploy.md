# App shell, PWA & deployment (GitHub Pages)
- Navigation is companion-first. Sections are hash routes: `#home` (default), `#systems`, `#outlaw`, `#calculators`, `#guides`, `#book1`…`#book6`, `#more`; `#new-system` opens the Add-system editor (home-screen shortcut). Below `lg` a bottom tab bar (Home · Systems · Outlaw · Codex · More) replaces the sidebar; `apps/web/wiki/index.html` carries the same bar.
- Edge-to-edge: `viewport-fit=cover` + `black-translucent` status bar, so fixed/sticky chrome pads with `env(safe-area-inset-*)` (see the App shell block in `apps/web/src/theme.css`).
- Device features (`apps/web/src/app/companion.js`) are feature-detected and degrade silently: Screen Wake Lock ("Keep screen on", stored per device in `localStorage` key `atlas_keep_awake`, not in `nms_state.json`), app-icon badge = ready outlaw stations, `navigator.vibrate` haptics (Android), Web Share for a system, the install prompt, and `navigator.storage.persist()` when installed.
- Live build: `.github/workflows/pages.yml` runs on every push to `main`, weekly (Mondays 06:17 UTC, to refresh the wiki) and on demand. It installs with pnpm on Node 24, runs `pnpm sync:wiki` (sync + verification; if the wiki is unreachable the committed archive ships and `verification.json` says so), then `pnpm typecheck`, `pnpm lint` and `pnpm test` on the synced data, commits any changed wiki pages back to `main` as `github-actions[bot]` ("Sync wiki mirror: N page(s) changed"), runs `pnpm build`, and publishes `apps/web/dist` (the two pages, bundled assets, `sw.js`, icons, manifest, `nms_state.json` and the wiki mirror). Browser tests aren't run in CI (owner's decision): `pnpm check` runs them locally before a push. One-time setup: Settings → Pages → Source: **GitHub Actions**.
- Sync relay (`apps/sync`, ADR-0005): a Cloudflare Worker with a D1 database, deployed from a developer machine, not CI, so no Cloudflare token is stored in GitHub. One-time setup, from `apps/sync`:
  1. `pnpm exec wrangler login` (a free Cloudflare account).
  2. `pnpm exec wrangler d1 create atlas-sync`, then put the printed `database_id` in `wrangler.toml`.
  3. `pnpm exec wrangler d1 migrations apply atlas-sync --remote`.
  4. `pnpm exec wrangler deploy`. It prints the `https://atlas-sync.<account>.workers.dev` address.

  Put that address in `apps/web/.env` as `VITE_SYNC_URL`. The app shows the Sync group only when it's set; browser tests build with `--mode e2e` (`apps/web/.env.e2e`) and answer a test address themselves. Redeploy with `pnpm exec wrangler deploy` after changing `apps/sync`. Local runs: `wrangler d1 migrations apply atlas-sync --local`, then `pnpm --filter @atlas/sync dev` (port 8787; `http://localhost:4173` and `:5173` are allowed origins). The relay is cross-origin, so the service worker never caches it.
- Site URL: `https://relmaur.github.io/nms-os/`. Every path in the app is relative so it works under that subpath.
- Service worker (`apps/web/src/sw/sw.ts`, Workbox via vite-plugin-pwa, served as `sw.js` so installed apps update in place):
  - **Precached** under content-hash revisions: the pages, bundled JS/CSS, icons, manifest, Latin and Greek font files, and `wiki/*.json` + `offline-bundle.js`. A deploy that changes any of them installs a new worker, which takes over at once (`skipWaiting` + `clientsClaim`); the next open shows the new version.
  - **Network-first** (5 s): `nms_state.json` and `wiki/verification.json`, also fetched while the worker installs, since the first visit loads them before the worker controls the page.
  - **Stale-while-revalidate:** wiki articles (`wiki/**/*.md`), cached as they are read. **Cache-first:** other font subsets.
  - The pre-3.1 worker's caches (`atlas-os-*`) are deleted on activate.
  - The worker registers only in production builds (`pnpm build` / `pnpm preview`), not under `pnpm dev`.
- Service workers only run on HTTPS or `localhost`. Over a plain-http LAN address the app works online-only.
- `nms_state.json` is published with the site. Edits made on a phone stay in that phone's browser storage; use Export/Import to move them, and commit the exported file as `apps/web/public/nms_state.json` to update the shared copy.
- Icons: edit `apps/web/public/assets/icons/icon.svg` / `icon-maskable.svg` (Phosphor "planet" fill), then re-render the PNGs at 192, 512, 512 (maskable) and 180 (apple-touch).
