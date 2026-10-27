// Recipe planner, built upward: raw stock in the cargo hold at the bottom, crafting rounds stacked above it, the
// product as the capstone. The player ticks off what they've gathered and crafted; a round lights once its inputs
// are ticked. Every number is the wiki's recipes and base values, or arithmetic on them (docs/calculators.md).
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatQty, formatUnits } from '@atlas/core/calc';
import {
  buildPlan,
  craftKey,
  findItem,
  planProgress,
  planRecipes,
  rawKey,
  type BuildPlan,
  type Catalog,
  type PlanProgress,
  type PlanStep,
  type StepState
} from '@atlas/core/planner';
import type { GameItem } from '@atlas/core/game-data';
import { showToast } from '../../app/ui.ts';
import { readProgress, writeProgress, type PlanSettings } from './progress.ts';

const PRESETS = ['Stasis Device', 'Fusion Ignitor', 'Circuit Board', 'Living Glass', 'Anomalous Doughnut'];
const DEFAULT_PLAN: PlanSettings = { item: 'Stasis Device', qty: 1, choices: {} };
const MAX_QTY = 9999;
const DELTA_MS = 5000;

const rawValue = (plan: BuildPlan) => plan.raw.reduce((sum, entry) => sum + (entry.item?.value ?? 0) * entry.qty, 0);
const codexHref = (item: GameItem) => `wiki/#/a/${encodeURIComponent(item.path)}`;

function ItemName({ item, title, className = '' }: { item: GameItem | undefined; title: string; className?: string }) {
  return item ? (
    <a
      href={codexHref(item)}
      className={`underline decoration-slate-600 underline-offset-[3px] hover:text-cyan-200 hover:decoration-cyan-400/60 ${className}`}
    >
      {title}
    </a>
  ) : (
    <span className={className}>{title}</span>
  );
}

export function Planner({ catalog }: { catalog: Catalog }) {
  const [saved] = useState(readProgress);
  const [settings, setSettings] = useState<PlanSettings>(() =>
    saved && findItem(catalog, saved.item) ? { item: saved.item, qty: saved.qty, choices: saved.choices } : DEFAULT_PLAN
  );
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set(saved?.ticked ?? []));
  const [query, setQuery] = useState(settings.item);
  const [delta, setDelta] = useState<{ amount: number; at: number } | null>(null);

  const plan = useMemo(() => buildPlan(catalog, settings.item, settings.qty, settings.choices), [catalog, settings]);
  const progress = plan ? planProgress(plan, ticked) : null;

  useEffect(() => {
    writeProgress(settings, ticked);
  }, [settings, ticked]);
  useEffect(() => {
    if (!delta) return;
    const timer = setTimeout(() => {
      setDelta(null);
    }, DELTA_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [delta]);

  // A different plan (item, amount or recipe) starts with nothing ticked: the old ticks described other amounts.
  const replan = (next: PlanSettings) => {
    setSettings(next);
    setTicked(new Set());
  };
  const pickItem = (value: string) => {
    const item = findItem(catalog, value);
    if (!item) {
      setQuery(settings.item);
      return;
    }
    if (!planRecipes(catalog, item).length) {
      showToast(`${item.title} has no crafting or cooking recipe on the wiki.`);
      setQuery(settings.item);
      return;
    }
    setQuery(item.title);
    if (item.title !== settings.item) replan({ item: item.title, qty: settings.qty, choices: {} });
  };
  const setQty = (value: number) => {
    const qty = Math.max(1, Math.min(MAX_QTY, Math.round(value) || 1));
    if (qty !== settings.qty) replan({ ...settings, qty });
  };
  const switchRecipe = (step: PlanStep) => {
    if (!plan) return;
    const choices = { ...settings.choices, [step.title]: (step.index + 1) % step.recipes.length };
    const next = buildPlan(catalog, settings.item, settings.qty, choices);
    if (next) setDelta({ amount: rawValue(next) - rawValue(plan), at: Date.now() });
    replan({ ...settings, choices });
  };
  const toggle = (key: string) => {
    setTicked(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const craftable = useMemo(
    () =>
      [...catalog.byTitle.values()]
        .filter(item => !item.obsolete && planRecipes(catalog, item).length)
        .map(item => item.title)
        .sort((a, b) => a.localeCompare(b)),
    [catalog]
  );

  return (
    <div className="space-y-5">
      {/* The picker stays reachable while the plan scrolls; presets scroll away with the page. */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] lg:top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 sm:-mx-5 px-4 sm:px-5 py-3 bg-slate-950/90 backdrop-blur-md border-y border-slate-800/80">
        <div className="flex items-end gap-2.5">
          <label className="field flex-1 min-w-0">
            Item to make
            <input
              id="planItem"
              list="planItemOptions"
              type="search"
              autoComplete="off"
              spellCheck={false}
              value={query}
              placeholder="Search craftable and cookable items"
              onChange={event => {
                setQuery(event.target.value);
                // A datalist pick replaces the whole value at once; plain typing waits for Enter or leaving the field.
                const inputType = (event.nativeEvent as InputEvent).inputType as string | undefined;
                if (!inputType || inputType === 'insertReplacementText') pickItem(event.target.value);
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') pickItem(query);
              }}
              onBlur={() => {
                pickItem(query);
              }}
            />
          </label>
          <QtyStepper qty={settings.qty} onChange={setQty} />
        </div>
        <datalist id="planItemOptions">
          {craftable.map(title => (
            <option key={title} value={title} />
          ))}
        </datalist>
      </div>

      <div id="planPresets" className="flex flex-wrap gap-1.5">
        {PRESETS.filter(title => findItem(catalog, title)).map(title => (
          <button
            key={title}
            type="button"
            aria-pressed={title === settings.item}
            onClick={() => {
              pickItem(title);
            }}
            className="tag-filter"
          >
            {title}
          </button>
        ))}
      </div>

      <div id="planResult">
        {plan && progress ? (
          <>
            <Capstone plan={plan} progress={progress} ticked={ticked} onToggle={toggle} delta={delta?.amount ?? null} />
            <Rounds plan={plan} progress={progress} ticked={ticked} onToggle={toggle} onSwitch={switchRecipe} />
            <Hold
              plan={plan}
              progress={progress}
              ticked={ticked}
              onToggle={toggle}
              onReset={() => {
                setTicked(new Set());
              }}
            />
            <p className="text-xs text-slate-400 mt-6 max-w-prose">
              From the wiki’s recipes for <ItemName item={plan.product.item} title={plan.product.title} /> and its
              ingredients (wiki revision {plan.product.item?.revId}). Raw means the wiki lists no crafting or cooking
              recipe; it may still be refinable. Ticks are kept on this device for this plan only.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400">Pick an item to plan.</p>
        )}
      </div>
    </div>
  );
}

function QtyStepper({ qty, onChange }: { qty: number; onChange: (qty: number) => void }) {
  const [text, setText] = useState(String(qty));
  const [prev, setPrev] = useState(qty);
  if (prev !== qty) {
    // The plan's amount changed from outside the field (the steppers): show it.
    setPrev(qty);
    setText(String(qty));
  }
  const button =
    'w-10 h-10 shrink-0 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400/60 text-slate-200 flex items-center justify-center disabled:opacity-40 disabled:hover:border-slate-700';
  return (
    <div className="flex items-end gap-1">
      <button
        type="button"
        aria-label="One fewer"
        disabled={qty <= 1}
        onClick={() => {
          onChange(qty - 1);
        }}
        className={button}
      >
        <i className="ph-bold ph-minus" />
      </button>
      <label className="field w-[4.5rem]">
        How many
        <input
          id="planQty"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_QTY}
          value={text}
          onChange={event => {
            setText(event.target.value);
            const value = Number(event.target.value);
            if (event.target.value !== '' && value >= 1) onChange(value);
          }}
          onBlur={() => {
            setText(String(qty));
          }}
          className="text-center font-mono tabular-nums"
        />
      </label>
      <button
        type="button"
        aria-label="One more"
        disabled={qty >= MAX_QTY}
        onClick={() => {
          onChange(qty + 1);
        }}
        className={button}
      >
        <i className="ph-bold ph-plus" />
      </button>
    </div>
  );
}

// A large tick target for gloved-hand glances: a real checkbox, drawn as an inventory slot.
function Tick({
  checked,
  ready,
  label,
  onChange
}: {
  checked: boolean;
  ready: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="relative shrink-0 w-11 h-11 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-xl border flex items-center justify-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan-300 ${
          checked
            ? 'bg-emerald-400 border-emerald-300 text-slate-950'
            : ready
              ? 'bg-emerald-400/10 border-emerald-400/70 text-emerald-300 shadow-[0_4px_14px_-4px_rgba(52,211,153,0.45)]'
              : 'bg-slate-950 border-slate-700 text-slate-600 hover:border-slate-500'
        }`}
      >
        <i className={`ph-bold ${checked ? 'ph-check' : 'ph-hammer'} text-lg`} />
      </span>
    </label>
  );
}

function Inputs({ step, ticked }: { step: PlanStep; ticked: ReadonlySet<string> }) {
  return (
    <ul className="flex flex-wrap gap-1.5 mt-2" aria-label={`Inputs for ${step.title}`}>
      {step.inputs.map(input => {
        const have = ticked.has(input.raw ? rawKey(input.title) : craftKey(input.title));
        return (
          <li
            key={input.title}
            className={`inline-flex items-center gap-1.5 h-7 px-2 rounded-lg border text-xs ${
              have
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-slate-700 bg-slate-900 text-slate-200'
            }`}
          >
            <span className={`font-mono tabular-nums ${input.raw ? 'text-emerald-300' : 'text-cyan-200'}`}>
              {formatQty(input.qty)}
            </span>
            {input.title}
            {have ? <i className="ph-bold ph-check text-emerald-300" aria-label="ticked" /> : null}
          </li>
        );
      })}
    </ul>
  );
}

function StepMeta({ step }: { step: PlanStep }) {
  const parts = [
    step.recipe.type === 'cook' ? 'Nutrient Processor' : 'Crafted',
    step.recipe.blueprint ? 'blueprint' : '',
    step.makes > step.qty ? `makes ${formatQty(step.makes)}` : ''
  ].filter(Boolean);
  return <span className="text-xs text-slate-400">{parts.join(' · ')}</span>;
}

function RecipeSwitch({ step, onSwitch }: { step: PlanStep; onSwitch: (step: PlanStep) => void }) {
  if (step.recipes.length < 2) return null;
  return (
    <button
      type="button"
      data-title={step.title}
      onClick={() => {
        onSwitch(step);
      }}
      title="Switch to another recipe"
      className="mt-2 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-slate-700 hover:border-cyan-400/60 text-[11px] text-slate-300 hover:text-cyan-200"
    >
      <i className="ph-bold ph-arrows-clockwise" />
      Recipe {step.index + 1} of {step.recipes.length}
    </button>
  );
}

function Capstone({
  plan,
  progress,
  ticked,
  onToggle,
  delta
}: {
  plan: BuildPlan;
  progress: PlanProgress;
  ticked: ReadonlySet<string>;
  onToggle: (key: string) => void;
  delta: number | null;
}) {
  const { product } = plan;
  const worth = (product.item?.value ?? 0) * product.qty;
  const inputs = rawValue(plan);
  const unpriced = plan.raw.filter(entry => !entry.item?.value).length;
  const state = progress.step(product.title);
  const started = progress.gathered > 0 || progress.crafted > 0;
  return (
    <section
      aria-labelledby="planProduct"
      className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-colors duration-500 ${
        progress.complete
          ? 'border-emerald-400/60 bg-emerald-950/40'
          : 'border-cyan-400/30 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(34,211,238,0.14),rgba(11,19,37,0.9)_60%)]'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono tabular-nums text-cyan-200 text-lg leading-none">×{formatQty(product.qty)}</p>
          <h3
            id="planProduct"
            className="font-display font-bold text-2xl sm:text-3xl text-white leading-tight mt-1.5 break-words"
          >
            <ItemName item={product.item} title={product.title} className="decoration-slate-700" />
          </h3>
          <StepMeta step={product} />
        </div>
        <Tick
          checked={ticked.has(craftKey(product.title))}
          ready={state === 'ready'}
          label={`Crafted ${formatQty(product.qty)} ${product.title}`}
          onChange={() => {
            onToggle(craftKey(product.title));
          }}
        />
      </div>
      <Inputs step={product} ticked={ticked} />

      <dl className="grid grid-cols-2 gap-x-4 mt-5 pt-4 border-t border-slate-700/60">
        <div>
          <dt className="text-xs text-slate-400">Worth at base value</dt>
          <dd className="font-mono tabular-nums text-lg text-amber-200 mt-1">
            {product.item?.value ? `${formatUnits(worth)} Units` : 'not on the wiki'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Raw inputs at base value</dt>
          <dd className="font-mono tabular-nums text-lg text-white mt-1">
            {formatUnits(inputs)} Units
            {delta !== null ? (
              <span
                role="status"
                className={`block text-xs font-sans ${delta < 0 ? 'text-emerald-300' : delta > 0 ? 'text-amber-300' : 'text-slate-300'}`}
              >
                {delta ? (
                  <>
                    <i className={`ph-bold ${delta < 0 ? 'ph-arrow-down' : 'ph-arrow-up'}`} />
                    {` ${formatUnits(Math.abs(delta))} with that recipe`}
                  </>
                ) : (
                  'No change with that recipe'
                )}
              </span>
            ) : unpriced ? (
              <span className="block text-[11px] font-sans text-slate-400">{unpriced} without a value</span>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-300">
          {progress.complete
            ? 'Crafted. The plan is complete.'
            : started
              ? `${String(progress.gathered)} of ${String(plan.raw.length)} gathered · ${String(progress.crafted)} of ${String(plan.steps)} crafted`
              : `${String(plan.steps)} crafts in ${String(plan.rounds.length + 1)} rounds · ${String(plan.raw.length)} raw materials`}
        </p>
        {progress.complete ? null : (
          <a
            href="#planHold"
            onClick={event => {
              event.preventDefault();
              document.getElementById('planHold')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="h-10 px-4 rounded-xl bg-cyan-400/10 border border-cyan-400/40 hover:bg-cyan-400/20 text-sm font-medium text-cyan-100 inline-flex items-center gap-2"
          >
            {started ? 'Back to the cargo hold' : 'Start at the cargo hold'}
            <i className="ph-bold ph-arrow-down" />
          </a>
        )}
      </div>
    </section>
  );
}

const roundText = (state: StepState, index: number) =>
  state === 'waiting' && index === 0 ? 'Needs the cargo hold' : ROUND_TEXT[state];
const ROUND_TEXT: Record<StepState, string> = {
  done: 'Crafted',
  ready: 'Ready to craft',
  waiting: 'Needs the round below'
};

function Rounds({
  plan,
  progress,
  ticked,
  onToggle,
  onSwitch
}: {
  plan: BuildPlan;
  progress: PlanProgress;
  ticked: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onSwitch: (step: PlanStep) => void;
}) {
  const [opened, setOpened] = useState<ReadonlySet<number>>(new Set()); // done rounds the player reopened
  if (!plan.rounds.length) return null;
  return (
    <section aria-label="Crafting rounds, last first" className="mt-2">
      <ol>
        {plan.rounds
          .map((round, index) => ({ round, index }))
          .reverse()
          .map(({ round, index }) => {
            const state = progress.round(index);
            const collapsed = state === 'done' && !opened.has(index);
            return (
              <li key={index} className="relative pl-9 pt-6">
                {/* The spine: dim while waiting; it fills upward, emerald, once the round can be crafted. */}
                <span aria-hidden="true" className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-800" />
                <span
                  aria-hidden="true"
                  className={`absolute left-[15px] top-0 bottom-0 w-px origin-bottom bg-emerald-400/70 transition-transform duration-700 ease-out motion-reduce:transition-none ${
                    state === 'waiting' ? 'scale-y-0' : 'scale-y-100'
                  }`}
                />
                <span
                  aria-hidden="true"
                  className={`absolute left-[9px] top-[1.85rem] w-[13px] h-[13px] rotate-45 rounded-[3px] border ${
                    state === 'done'
                      ? 'bg-emerald-400 border-emerald-300'
                      : state === 'ready'
                        ? 'bg-slate-950 border-emerald-400 shadow-[0_2px_10px_-2px_rgba(52,211,153,0.6)]'
                        : 'bg-slate-950 border-slate-600'
                  }`}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h4 className="font-display font-bold text-sm text-white tracking-wide">Round {index + 1}</h4>
                  <p
                    className={`text-xs ${state === 'done' ? 'text-emerald-300' : state === 'ready' ? 'text-emerald-200' : 'text-slate-400'}`}
                  >
                    {roundText(state, index)} · {round.length} {round.length === 1 ? 'craft' : 'crafts'}
                  </p>
                </div>
                {collapsed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpened(new Set(opened).add(index));
                    }}
                    className="mt-2 text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5"
                  >
                    <i className="ph-bold ph-caret-down" />
                    Show {round.map(step => step.title).join(', ')}
                  </button>
                ) : (
                  <ul className="mt-1 divide-y divide-slate-800/70">
                    {round.map(step => {
                      const stepState = progress.step(step.title);
                      return (
                        <li key={step.title} className="flex items-start gap-3 py-3">
                          <Tick
                            checked={stepState === 'done'}
                            ready={stepState === 'ready'}
                            label={`Crafted ${formatQty(step.qty)} ${step.title}`}
                            onChange={() => {
                              onToggle(craftKey(step.title));
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="font-mono tabular-nums text-sm text-cyan-200">
                                {formatQty(step.qty)}×
                              </span>
                              <ItemName item={step.item} title={step.title} className="text-[0.9375rem] text-white" />
                              <StepMeta step={step} />
                            </p>
                            <Inputs step={step} ticked={ticked} />
                            <RecipeSwitch step={step} onSwitch={onSwitch} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
      </ol>
    </section>
  );
}

function Hold({
  plan,
  progress,
  ticked,
  onToggle,
  onReset
}: {
  plan: BuildPlan;
  progress: PlanProgress;
  ticked: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const any = progress.gathered > 0 || progress.crafted > 0;
  return (
    <section id="planHold" aria-labelledby="planHoldTitle" className="relative mt-4 sm:pl-9 scroll-mt-40">
      <span
        aria-hidden="true"
        className="hidden sm:block absolute left-[15px] -top-4 h-8 w-px bg-linear-to-b from-slate-800 to-cyan-400/60"
      />
      <span
        aria-hidden="true"
        className="hidden sm:flex absolute left-[7px] top-4 w-[17px] h-[17px] rounded-full border border-cyan-400/70 bg-slate-950 items-center justify-center"
      >
        <i className="ph-bold ph-arrow-up text-[10px] text-cyan-300" />
      </span>
      <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-3 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4 ref={heading} id="planHoldTitle" className="font-display font-bold text-base text-white">
            Cargo hold
          </h4>
          <p className="text-xs text-slate-300">
            <span className="font-mono tabular-nums text-emerald-300">{progress.gathered}</span> of{' '}
            <span className="font-mono tabular-nums">{plan.raw.length}</span> gathered
          </p>
        </div>
        <p className="text-xs text-slate-400 mt-1">Start here: gather these, then craft upward one round at a time.</p>
        <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2 mt-4">
          {plan.raw.map(entry => {
            const checked = ticked.has(rawKey(entry.title));
            return (
              <li key={entry.title} data-raw={entry.title} data-qty={entry.qty}>
                <label
                  className={`relative flex flex-col justify-between h-[5.75rem] sm:h-24 rounded-xl border p-2 cursor-pointer transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan-300 ${
                    checked
                      ? 'border-emerald-400/70 bg-emerald-500/10'
                      : 'border-slate-700 bg-[linear-gradient(160deg,rgba(30,41,59,0.55),rgba(2,6,23,0.9))] hover:border-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      onToggle(rawKey(entry.title));
                    }}
                    aria-label={`Gathered ${formatQty(entry.qty)} ${entry.title}`}
                    className="sr-only"
                  />
                  <span
                    className={`text-[11px] sm:text-xs leading-tight line-clamp-2 hyphens-auto break-words ${checked ? 'text-slate-400' : 'text-slate-100'}`}
                  >
                    {entry.title}
                  </span>
                  <span className="flex items-end justify-between gap-1">
                    <span
                      aria-hidden="true"
                      className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${
                        checked ? 'bg-emerald-400 border-emerald-300 text-slate-950' : 'border-slate-600'
                      }`}
                    >
                      {checked ? <i className="ph-bold ph-check text-xs" /> : null}
                    </span>
                    <span
                      className={`font-mono tabular-nums text-sm sm:text-base leading-none ${checked ? 'text-emerald-300' : 'text-cyan-200'}`}
                    >
                      {formatQty(entry.qty)}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {any ? (
          <button
            type="button"
            onClick={() => {
              onReset();
              heading.current?.scrollIntoView({ block: 'nearest' });
            }}
            className="mt-4 text-xs text-slate-400 hover:text-rose-200 inline-flex items-center gap-1.5"
          >
            <i className="ph-bold ph-arrow-counter-clockwise" />
            Clear all ticks
          </button>
        ) : null}
      </div>
    </section>
  );
}
