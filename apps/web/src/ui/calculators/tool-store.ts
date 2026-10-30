// Which calculator the dock shows. It lasts while the page is open (back from another screen, the same tool), and a
// fresh start opens on Best crafts. Not saved, like the Systems panel state. The recipe planner is its own screen
// (#plan/<item>, Planner.tsx).
import { useSyncExternalStore } from 'react';

export const TOOLS = ['profit', 'value', 'extractors', 'registers'] as const;
export type Tool = (typeof TOOLS)[number];

let tool: Tool = 'profit';
const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTool(next: Tool): void {
  if (next === tool) return;
  tool = next;
  listeners.forEach(listener => {
    listener();
  });
}

export const useTool = (): Tool => useSyncExternalStore(subscribe, () => tool);
