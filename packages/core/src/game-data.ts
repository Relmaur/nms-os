// The structured wiki dataset (wiki/game-data.json) and the recipe shape inside each article's frontmatter.
// The wiki sync produces it; the calculators consume it. Both sides parse it with these schemas (ADR-0004).
import { z } from 'zod';

// Quantities are numbers; the wiki occasionally writes a range or a word ("1-3"), which is kept as text.
export const RecipeItemSchema = z.object({ name: z.string(), qty: z.union([z.number(), z.string()]) });

export const RecipeTypeSchema = z.enum(['craft', 'refine', 'cook', 'repair', 'dismantle']);

export const RecipeSchema = z.object({
  type: RecipeTypeSchema,
  inputs: z.array(RecipeItemSchema),
  outputs: z.array(RecipeItemSchema),
  seconds: z.number().optional(),
  label: z.string().optional(),
  blueprint: z.literal(true).optional(),
  obsolete: z.literal(true).optional()
});

export const GameItemSchema = z.object({
  title: z.string(),
  slug: z.string(),
  category: z.string(),
  path: z.string(),
  summary: z.string(),
  source: z.literal('wiki'),
  url: z.string().optional(),
  kind: z.string().optional(),
  revId: z.number().int(),
  revTimestamp: z.string().optional(),
  version: z.string().optional(),
  obsolete: z.literal(true).optional(),
  removed: z.literal(true).optional(),
  fields: z.record(z.string(), z.string()),
  value: z.number().optional(),
  recipes: z.array(RecipeSchema)
});

export const GameDataSchema = z.object({
  schema: z.literal(1),
  source: z.string(),
  license: z.string(),
  aliases: z.record(z.string(), z.string()),
  items: z.array(GameItemSchema)
});

export type RecipeItem = z.infer<typeof RecipeItemSchema>;
export type RecipeType = z.infer<typeof RecipeTypeSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type GameItem = z.infer<typeof GameItemSchema>;
export type GameData = z.infer<typeof GameDataSchema>;
