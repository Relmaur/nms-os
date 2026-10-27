// What the player has ticked off in the planner, kept on this device only (like keep-awake): not part of
// nms_state.json or exports. Ticks belong to one plan (item, quantity, recipe choices); a different plan starts fresh.
import { z } from 'zod';

const KEY = 'atlas_plan_progress';
const StoredSchema = z.object({
  item: z.string(),
  qty: z.number().int().min(1).max(9999),
  choices: z.record(z.string(), z.number().int().nonnegative()),
  ticked: z.array(z.string())
});
export type PlanSettings = Omit<z.infer<typeof StoredSchema>, 'ticked'>;

export function readProgress(): z.infer<typeof StoredSchema> | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (StoredSchema.safeParse(JSON.parse(raw)).data ?? null) : null;
  } catch {
    return null; // unreadable or blocked storage: start with nothing ticked
  }
}

export function writeProgress(settings: PlanSettings, ticked: ReadonlySet<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...settings, ticked: [...ticked] }));
  } catch {
    // Storage full or blocked: ticks still work for this visit, they just won't survive a reload.
  }
}
