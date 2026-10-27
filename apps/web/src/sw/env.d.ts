// Build-time settings the service worker reads (apps/web/.env; the page's copy is src/env.d.ts).
interface ImportMetaEnv {
  readonly VITE_SYNC_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
