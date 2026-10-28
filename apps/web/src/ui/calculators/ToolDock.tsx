// The calculators' switcher: the recipe planner as the wide lead cell, carrying the plan in progress so the way back
// to it is always in view, then the four small tools (Best crafts first: it hands its picks to the planner). ARIA tabs: arrow keys, Home and End move between them.
import type { KeyboardEvent } from 'react';
import { setTool, TOOLS, useTool, type Tool } from './tool-store.ts';

// [name, icon, hue]
const SMALL: Record<Exclude<Tool, 'planner'>, readonly [string, string, string]> = {
  profit: ['Best crafts', 'ph-trend-up', 'text-cyan-300'],
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

export function ToolDock({ summary }: { summary: string }) {
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

  // On a phone the planner takes the whole first row, so the plan in progress reads in full; from sm up, one row.
  return (
    <div
      id="calcDock"
      role="tablist"
      aria-label="Calculators"
      onKeyDown={onKeyDown}
      className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] grid grid-cols-4 sm:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] gap-1.5 sm:gap-2 sm:p-2 sm:rounded-2xl sm:bg-slate-950/70 sm:border sm:border-slate-800"
    >
      <button
        {...tab('planner')}
        className={`${cell(current === 'planner')} col-span-4 sm:col-span-1 h-12 sm:h-14 flex items-center gap-3 px-3 text-left`}
      >
        <span
          className={`flex w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg items-center justify-center ${current === 'planner' ? 'bg-cyan-400/15 text-cyan-200' : 'bg-slate-800 text-cyan-300'}`}
        >
          <i className="ph-bold ph-stack text-lg" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-display font-bold text-sm leading-5 text-white">Recipe planner</span>
          {summary ? (
            <span
              id="calcPlanSummary"
              className="block truncate font-mono tabular-nums text-xs leading-4 text-cyan-100/80"
            >
              {summary}
            </span>
          ) : null}
        </span>
      </button>
      {(Object.keys(SMALL) as Exclude<Tool, 'planner'>[]).map(tool => {
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
