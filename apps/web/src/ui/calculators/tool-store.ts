// Which calculator the dock shows. It lasts while the page is open (back from another screen, the same tool), and a
// fresh start opens on Base value. Not saved, like the Systems panel state. The recipe planner (#plan/<item>) and
// Best crafts (#crafts) are screens of their own.
import { useSyncExternalStore } from 'react';

export const TOOLS = ['value', 'extractors', 'registers'] as const;
export type Tool = (typeof TOOLS)[number];

let tool: Tool = 'value';
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
