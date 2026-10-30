// The calculators' switcher between the three small tools. ARIA tabs: arrow keys, Home and End move between them.
// The recipe planner and Best crafts are screens of their own, linked above the dock.
import type { KeyboardEvent } from 'react';
import { setTool, TOOLS, useTool, type Tool } from './tool-store.ts';

// [name, icon, hue]
const SMALL: Record<Tool, readonly [string, string, string]> = {
  value: ['Base value', 'ph-coins', 'text-amber-300'],
  extractors: ['Extractors', 'ph-mountains', 'text-emerald-300'],
  registers: ['Registers', 'ph-terminal-window', 'text-purple-300']
};

export const tabId = (tool: Tool) => `calcTab-${tool}`;
export const panelId = (tool: Tool) => `calcPanel-${tool}`;

const cell = (on: boolean) =>
  `min-w-0 rounded-xl border transition-colors duration-150 ${
    on
      ? 'border-cyan-400/50 bg-cyan-500/10 text-white'
      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white'
  }`;

export function ToolDock() {
  const current = useTool();
  const select = (tool: Tool, focus = false) => {
    setTool(tool);
    if (focus) document.getElementById(tabId(tool))?.focus({ preventScroll: true });
    // From partway down the page (the dock under the sticky header or above it), the chosen tool starts in view.
    const box = document.getElementById('calcDock');
    if (box && box.getBoundingClientRect().top < parseFloat(getComputedStyle(box).scrollMarginTop))
      box.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const at = TOOLS.indexOf(current);
    const to =
      event.key === 'ArrowRight'
        ? (at + 1) % TOOLS.length
        : event.key === 'ArrowLeft'
          ? (at + TOOLS.length - 1) % TOOLS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? TOOLS.length - 1
              : -1;
    const tool = TOOLS[to];
    if (!tool) return;
    event.preventDefault();
    select(tool, true);
  };
  const tab = (tool: Tool) => ({
    id: tabId(tool),
    role: 'tab',
    type: 'button' as const,
    'aria-selected': current === tool,
    'aria-controls': panelId(tool),
    tabIndex: current === tool ? 0 : -1,
    onClick: () => {
      select(tool);
    }
  });

  return (
    <div
      id="calcDock"
      role="tablist"
      aria-label="Calculators"
      onKeyDown={onKeyDown}
      className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] grid grid-cols-3 gap-1.5 sm:gap-2 sm:p-2 sm:rounded-2xl sm:bg-slate-950/70 sm:border sm:border-slate-800"
    >
      {TOOLS.map(tool => {
        const [name, icon, hue] = SMALL[tool];
        return (
          <button
            key={tool}
            {...tab(tool)}
            className={`${cell(current === tool)} h-14 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 sm:px-3`}
          >
            <i className={`ph-bold ${icon} text-base ${hue}`} aria-hidden="true" />
            <span className="max-w-full text-[11px] sm:text-sm leading-4 font-medium truncate">{name}</span>
          </button>
        );
      })}
    </div>
  );
}
