// The last few things opened from search, shown under an empty search field. Kept on this device only (like the
// planner's progress): not part of nms_state.json, exports or sync.
import { z } from 'zod';

const KEY = 'atlas_search_recent';
const MAX = 5;
const RecentSchema = z.object({
  type: z.enum(['system', 'gear', 'note', 'wiki', 'book']),
  id: z.string().max(500), // a system, gear or note id, a wiki path, or a book's section
  title: z.string().max(200)
});
export type Recent = z.infer<typeof RecentSchema>;

export function readRecent(): Recent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (z.array(RecentSchema).max(MAX).safeParse(JSON.parse(raw)).data ?? []) : [];
  } catch {
    return []; // unreadable or blocked storage: nothing recent
  }
}

export function rememberRecent(item: Recent): void {
  const next = [item, ...readRecent().filter(old => !(old.type === item.type && old.id === item.id))].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the search still works, it just won't list this as recent.
  }
}
