// Which calculator the dock shows. It lasts while the page is open (back from another screen, the same tool), and a
// fresh start opens on the recipe planner, the one the screen is for. Not saved, like the Systems panel state.
import { useSyncExternalStore } from 'react';

export const TOOLS = ['planner', 'profit', 'value', 'extractors', 'registers'] as const;
export type Tool = (typeof TOOLS)[number];

let tool: Tool = 'planner';
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

// "Plan it" from another tool (Best crafts): the planner takes the item, and the dock switches to it. A counter, so
// asking for the same item twice still reaches the planner.
let request: { title: string; nonce: number } | null = null;
const requestListeners = new Set<() => void>();

export function planItem(title: string): void {
  request = { title, nonce: (request?.nonce ?? 0) + 1 };
  requestListeners.forEach(listener => {
    listener();
  });
  setTool('planner');
}

export const usePlanRequest = (): { title: string; nonce: number } | null =>
  useSyncExternalStore(
    listener => {
      requestListeners.add(listener);
      return () => requestListeners.delete(listener);
    },
    () => request
  );
