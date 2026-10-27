// Schemas for the wiki mirror's files the app reads at run time (docs/wiki-mirror.md): the light index
// (wiki/index.json), the offline bundle with article bodies (wiki/offline-bundle.js), the last verification
// (wiki/verification.json), and drafts of the player's own articles kept in this browser.
import { z } from 'zod';

// Unknown fields (url, revId, recipes, …) are kept: the Codex shows them, and the sync may add more.
export const WikiEntrySchema = z
  .object({
    title: z.string().min(1),
    category: z.string(),
    path: z.string(),
    summary: z.string().optional(),
    source: z.string().optional(),
    body: z.string().optional(),
    obsolete: z.boolean().optional(),
    removed: z.boolean().optional(),
    url: z.string().optional(),
    revId: z.number().optional(),
    revTimestamp: z.string().optional(),
    version: z.string().optional()
  })
  .loose();
export type WikiEntry = z.infer<typeof WikiEntrySchema>;

export const WikiIndexSchema = z.array(WikiEntrySchema);

export const WikiBundleSchema = z.object({
  aliases: z.record(z.string(), z.string()).default({}),
  articles: z.array(WikiEntrySchema)
});
export type WikiBundle = z.infer<typeof WikiBundleSchema>;

// One malformed article is left out (and counted), not the whole Codex.
export function parseBundle(value: unknown): { bundle: WikiBundle; dropped: number } | null {
  const shell = z.object({ aliases: z.unknown(), articles: z.array(z.unknown()) }).safeParse(value);
  if (!shell.success) return null;
  const articles = shell.data.articles.flatMap(item => WikiEntrySchema.safeParse(item).data ?? []);
  const aliases = z.record(z.string(), z.string()).safeParse(shell.data.aliases ?? {}).data ?? {};
  return { bundle: { aliases, articles }, dropped: shell.data.articles.length - articles.length };
}

export const VerificationSchema = z
  .object({
    status: z.string(),
    checkedAt: z.string(),
    pages: z.number().optional(),
    matched: z.number().optional(),
    obsolete: z.number().optional(),
    excluded: z.number().optional(),
    removed: z.array(z.unknown()).optional()
  })
  .loose();
export type Verification = z.infer<typeof VerificationSchema>;

export const DraftSchema = z.object({
  title: z.string().min(1),
  slug: z.string(),
  category: z.string(),
  path: z.string(),
  summary: z.string(),
  body: z.string()
});
export type Draft = z.infer<typeof DraftSchema>;

// A damaged draft is dropped, not the whole list.
export function parseDrafts(value: unknown): Draft[] {
  return Array.isArray(value) ? value.flatMap(item => DraftSchema.safeParse(item).data ?? []) : [];
}
