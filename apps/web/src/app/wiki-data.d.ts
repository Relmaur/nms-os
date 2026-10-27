// Types for the Codex data loading (wiki-data.js) that React screens call.
import type * as engine from '@atlas/core/search';
import type { Draft, WikiBundle } from '@atlas/core/wiki-files';

export const WikiSearch: typeof engine & {
  escapeHtml: (value: unknown) => string;
  readDrafts: () => Draft[];
  writeDrafts: (drafts: Draft[]) => void;
  loadBundle: (base: string) => Promise<WikiBundle | null>;
  load: (base: string, options?: { withBodies?: boolean }) => Promise<engine.PreparedEntry[]>;
};
