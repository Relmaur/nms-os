// Recipe planner, built upward: raw stock in the cargo hold at the bottom, crafting rounds stacked above it, the
// product as the capstone. The player ticks off what they've gathered and crafted; a round lights once its inputs
// are ticked. Every number is the wiki's recipes and base values, or arithmetic on them (docs/calculators.md).
import { Fragment, useMemo, useRef, useState } from 'react';
import { formatQty, formatUnits } from '@atlas/core/calc';
import {
  buildPlan,
  findItem,
  planProgress,
  planRecipes,
  rawKey,
  stepKey,
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
  // The saved plan comes back with its ticks; if its item has left the wiki data, the default starts fresh.
  const [saved] = useState(() => {
    const progress = readProgress();
    return progress && findItem(catalog, progress.item) ? progress : null;
  });
  const [settings, setSettings] = useState<PlanSettings>(() =>
    saved ? { item: saved.item, qty: saved.qty, choices: saved.choices } : DEFAULT_PLAN
  );
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set(saved?.ticked ?? []));
  const [query, setQuery] = useState(settings.item);
  // The last recipe switch and what it did to the raw inputs' value, shown at the switched row until the next change.
  const [switched, setSwitched] = useState<{ title: string; delta: number } | null>(null);

  const plan = useMemo(() => buildPlan(catalog, settings.item, settings.qty, settings.choices), [catalog, settings]);
  const progress = plan ? planProgress(plan, ticked) : null;

  const save = (next: PlanSettings, nextTicked: ReadonlySet<string>) => {
    writeProgress(next, nextTicked);
  };

  // Another amount or recipe keeps the ticks: each names an amount, so it holds wherever the new plan still needs
  // exactly that and lapses where it doesn't (and comes back if the plan does). A different item starts fresh.
  const replan = (next: PlanSettings) => {
    const fresh = next.item !== settings.item;
    const nextTicked = fresh ? new Set<string>() : ticked;
    setSettings(next);
    setTicked(nextTicked);
    setSwitched(null);
    save(next, nextTicked);
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
  // What switching a step to its next recipe would use and change, so the compare job isn't blind.
  const preview = (step: PlanStep): SwitchPreview | null => {
    if (!plan || step.recipes.length < 2) return null;
    const index = (step.index + 1) % step.recipes.length;
    const next = buildPlan(catalog, settings.item, settings.qty, { ...settings.choices, [step.title]: index });
    const recipe = step.recipes[index];
    if (!next || !recipe) return null;
    return {
      choices: { ...settings.choices, [step.title]: index },
      // In this plan's amounts (whole batches of the other recipe), not the recipe's per-batch ones.
      inputs: recipe.inputs
        .map(input => {
          const batches = Math.ceil(step.qty / (Number(recipe.outputs[0]?.qty) || 1));
          return `${formatQty((Number(input.qty) || 1) * batches)} ${input.name}`;
        })
        .join(' + '),
      delta: rawValue(next) - rawValue(plan)
    };
  };
  const switchRecipe = (step: PlanStep) => {
    const next = preview(step);
    if (!next) return;
    replan({ ...settings, choices: next.choices });
    setSwitched({ title: step.title, delta: next.delta });
  };
  const toggle = (key: string) => {
    const next = new Set(ticked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setTicked(next);
    save(settings, next);
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
              autoCorrect="off"
              value={query}
              placeholder="Search craftable and cookable items"
              onChange={event => {
                const { value } = event.target;
                setQuery(value);
                // A datalist pick replaces the whole value with an item's exact name: plan it at once. Typing, the
                // clear button and autocorrect wait for Enter or leaving the field.
                const inputType = (event.nativeEvent as InputEvent).inputType as string | undefined;
                const exact = findItem(catalog, value)?.title === value;
                if (exact && (!inputType || inputType === 'insertReplacementText')) pickItem(value);
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

      <div
        id="planPresets"
        className="flex gap-1.5 overflow-x-auto sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none]"
      >
        {PRESETS.filter(title => findItem(catalog, title)).map(title => (
          <button
            key={title}
            type="button"
            aria-pressed={title === settings.item}
            onClick={() => {
              pickItem(title);
            }}
            className="tag-filter shrink-0 whitespace-nowrap"
          >
            {title}
          </button>
        ))}
      </div>

      <div id="planResult">
        {plan && progress ? (
          <>
            <p role="status" className="sr-only">
              {switched ? switchedText(switched.title, switched.delta) : ''}
            </p>
            <Capstone plan={plan} progress={progress} ticked={ticked} onToggle={toggle} />
            <Rounds
              key={JSON.stringify(settings)}
              plan={plan}
              progress={progress}
              onToggle={toggle}
              onSwitch={switchRecipe}
              preview={preview}
              switched={switched}
            />
            <Hold
              plan={plan}
              progress={progress}
              ticked={ticked}
              onToggle={toggle}
              onReset={() => {
                setTicked(new Set());
                save(settings, new Set());
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
          }}
          // Typed amounts apply on Enter or leaving the field, so a stray keystroke doesn't replan (and clear ticks).
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          onBlur={() => {
            const value = Number(text);
            if (text !== '' && value >= 1) onChange(value);
            setText(String(Math.max(1, Math.min(MAX_QTY, Math.round(value) || qty))));
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
            ? 'bg-emerald-400 border-emerald-300 text-emerald-950'
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

// A step's ingredients as one line, the way a recipe reads: "10,000 Frost Crystal + 20,000 Solanium".
function Inputs({ step, progress }: { step: PlanStep; progress: PlanProgress }) {
  return (
    <p className="mt-1 text-sm leading-relaxed text-slate-300">
      <span className="sr-only">From </span>
      {step.inputs.map((input, i) => {
        const have = progress.has(input);
        return (
          <Fragment key={`${input.title}-${String(i)}`}>
            {i ? <span className="text-slate-500"> + </span> : null}
            <span className={`whitespace-nowrap ${have ? 'text-emerald-100' : ''}`}>
              <span className={`font-mono tabular-nums ${input.raw ? 'text-emerald-300' : 'text-cyan-200'}`}>
                {formatQty(input.qty)}
              </span>{' '}
              {input.title}
              {have ? (
                <>
                  <i className="ph-bold ph-check text-emerald-300 ml-1" aria-hidden="true" />
                  <span className="sr-only"> (ticked)</span>
                </>
              ) : null}
            </span>
          </Fragment>
        );
      })}
    </p>
  );
}

// How a plan's steps are made, when they all share it; rows then only mention what differs.
interface Norm {
  type: 'craft' | 'cook' | null;
  blueprint: boolean;
}
function planNorm(plan: BuildPlan): Norm {
  const steps = [...plan.rounds.flat(), plan.product];
  const type = steps.every(step => step.recipe.type === 'cook')
    ? 'cook'
    : steps.every(step => step.recipe.type === 'craft')
      ? 'craft'
      : null;
  return { type, blueprint: steps.every(step => step.recipe.blueprint) };
}
const normText = (norm: Norm) =>
  norm.type === 'cook'
    ? 'All cooked in the Nutrient Processor'
    : norm.type === 'craft'
      ? norm.blueprint
        ? 'All crafted from blueprints'
        : 'All crafted'
      : null;

function StepMeta({ step, norm }: { step: PlanStep; norm: Norm }) {
  const parts = [
    norm.type ? '' : step.recipe.type === 'cook' ? 'Nutrient Processor' : 'Crafted',
    !norm.blueprint && step.recipe.blueprint ? 'blueprint' : '',
    step.makes > step.qty ? `makes ${formatQty(step.makes)}` : ''
  ].filter(Boolean);
  return parts.length ? <span className="text-xs text-slate-400">{parts.join(' · ')}</span> : null;
}

interface SwitchPreview {
  choices: Record<string, number>;
  inputs: string;
  delta: number;
}
const signedUnits = (delta: number) =>
  delta ? `${delta < 0 ? '−' : '+'}${formatUnits(Math.abs(delta))} Units` : 'same value';
const switchedText = (title: string, delta: number) =>
  delta ? `${title}: raw inputs ${signedUnits(delta)} with this recipe` : `${title}: no change in raw inputs' value`;

function RecipeSwitch({
  step,
  preview,
  onSwitch
}: {
  step: PlanStep;
  preview: SwitchPreview | null;
  onSwitch: (step: PlanStep) => void;
}) {
  if (!preview) return null;
  return (
    <button
      type="button"
      data-title={step.title}
      onClick={() => {
        onSwitch(step);
      }}
      className="mt-2 w-full sm:w-auto text-left flex items-start gap-2 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-cyan-400/60 text-xs text-slate-300 hover:text-cyan-100"
    >
      <i className="ph-bold ph-arrows-clockwise mt-0.5 text-cyan-300" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block">
          Recipe {step.index + 1} of {step.recipes.length} · switch to the next
        </span>
        <span className="block text-slate-400">
          {preview.inputs}
          <span
            className={`whitespace-nowrap ${preview.delta < 0 ? 'text-emerald-300' : preview.delta > 0 ? 'text-amber-300' : ''}`}
          >
            {` · ${signedUnits(preview.delta)}`}
          </span>
        </span>
      </span>
    </button>
  );
}

// "Worth 148× its raw inputs": arithmetic on the two wiki base values, for the "is it worth crafting?" glance.
function ratioText(worth: number, inputs: number): string | null {
  if (!worth || !inputs) return null;
  const ratio = worth / inputs;
  return `Worth ${ratio >= 10 ? Math.round(ratio).toLocaleString() : ratio.toFixed(1)}× its raw inputs`;
}

function Capstone({
  plan,
  progress,
  ticked,
  onToggle
}: {
  plan: BuildPlan;
  progress: PlanProgress;
  ticked: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  const { product } = plan;
  const worth = (product.item?.value ?? 0) * product.qty;
  const inputs = rawValue(plan);
  const unpriced = plan.raw.filter(entry => !entry.item?.value).length;
  const state = progress.step(product.title);
  const started = progress.gathered > 0 || progress.crafted > 0;
  const norm = planNorm(plan);
  const ratio = ratioText(worth, inputs);
  return (
    <section
      aria-labelledby="planProduct"
      className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 transition-colors duration-500 ${
        progress.complete
          ? 'capstone-lit border-emerald-400/60 bg-emerald-950/40'
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
          <p className="text-xs text-slate-400 mt-1">
            {normText(norm) ?? <StepMeta step={product} norm={{ type: null, blueprint: false }} />}
          </p>
        </div>
        <Tick
          checked={ticked.has(stepKey(product))}
          ready={state === 'ready'}
          label={`Crafted ${formatQty(product.qty)} ${product.title}`}
          onChange={() => {
            onToggle(stepKey(product));
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
        <p className="text-sm text-slate-200">
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
            <i className="ph-bold ph-arrow-down" aria-hidden="true" />
          </a>
        )}
      </div>

      <Inputs step={product} progress={progress} />

      <dl className="grid grid-cols-2 gap-x-4 mt-5 pt-4 border-t border-slate-700/60">
        <div>
          <dt className="text-xs text-slate-400">Product worth</dt>
          <dd className="font-mono tabular-nums text-base sm:text-lg text-amber-200 mt-1 whitespace-nowrap">
            {product.item?.value ? `${formatUnits(worth)} Units` : 'not on the wiki'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Raw inputs worth</dt>
          <dd className="font-mono tabular-nums text-base sm:text-lg text-white mt-1 whitespace-nowrap">
            {formatUnits(inputs)} Units
          </dd>
        </div>
      </dl>
      <p className="text-xs text-slate-400 mt-2">
        {ratio ? <span className="text-slate-200">{ratio}</span> : null}
        {ratio ? ', at ' : 'At '}the wiki’s base values{unpriced ? ` (${String(unpriced)} raw without a value)` : ''}.
      </p>
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
  onToggle,
  onSwitch,
  preview,
  switched
}: {
  plan: BuildPlan;
  progress: PlanProgress;
  onToggle: (key: string) => void;
  onSwitch: (step: PlanStep) => void;
  preview: (step: PlanStep) => SwitchPreview | null;
  switched: { title: string; delta: number } | null;
}) {
  const norm = planNorm(plan);
  // Rounds already crafted when the plan opens start folded away; one finished now stays open (folding it would
  // pull the focused checkbox out from under the player) until they fold it.
  const [folded, setFolded] = useState<ReadonlySet<number>>(
    () => new Set(plan.rounds.map((_, index) => index).filter(index => progress.round(index) === 'done'))
  );
  if (!plan.rounds.length) return null;
  return (
    <section aria-label="Crafting rounds, last first" className="mt-2">
      <ol>
        {plan.rounds
          .map((round, index) => ({ round, index }))
          .reverse()
          .map(({ round, index }) => {
            const state = progress.round(index);
            const collapsed = state === 'done' && folded.has(index);
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
                    className={`text-xs ${
                      state === 'ready'
                        ? 'px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-200 font-medium'
                        : state === 'done'
                          ? 'text-emerald-300'
                          : 'text-slate-400'
                    }`}
                  >
                    {roundText(state, index)} · {round.length} {round.length === 1 ? 'craft' : 'crafts'}
                  </p>
                </div>
                {state === 'done' ? (
                  <button
                    type="button"
                    aria-expanded={!collapsed}
                    aria-controls={`planRound${String(index + 1)}`}
                    onClick={() => {
                      const next = new Set(folded);
                      if (collapsed) next.delete(index);
                      else next.add(index);
                      setFolded(next);
                    }}
                    className="mt-2 text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 text-left"
                  >
                    <i className={`ph-bold ${collapsed ? 'ph-caret-down' : 'ph-caret-up'}`} aria-hidden="true" />
                    {collapsed ? `Show ${round.map(step => step.title).join(', ')}` : 'Fold this round away'}
                  </button>
                ) : null}
                {collapsed ? null : (
                  // A round you can craft now is lit as a band, so it's findable on a long column without reading.
                  <ul
                    id={`planRound${String(index + 1)}`}
                    className={`mt-2 divide-y divide-slate-800/70 rounded-xl transition-colors duration-500 ${
                      state === 'ready' ? '-mx-3 px-3 bg-emerald-400/[0.06] ring-1 ring-inset ring-emerald-400/25' : ''
                    }`}
                  >
                    {round.map(step => {
                      const stepState = progress.step(step.title);
                      return (
                        <li key={step.title} className="flex items-start gap-3 py-3">
                          <Tick
                            checked={stepState === 'done'}
                            ready={stepState === 'ready'}
                            label={`Crafted ${formatQty(step.qty)} ${step.title}`}
                            onChange={() => {
                              onToggle(stepKey(step));
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="font-mono tabular-nums text-sm text-cyan-200">
                                {formatQty(step.qty)}×
                              </span>
                              <ItemName item={step.item} title={step.title} className="text-[0.9375rem] text-white" />
                              <StepMeta step={step} norm={norm} />
                            </p>
                            <Inputs step={step} progress={progress} />
                            {switched?.title === step.title ? (
                              <p
                                aria-hidden="true"
                                className={`mt-2 text-xs ${switched.delta < 0 ? 'text-emerald-300' : switched.delta > 0 ? 'text-amber-300' : 'text-slate-300'}`}
                              >
                                <i className="ph-bold ph-check" />{' '}
                                {switched.delta
                                  ? `Switched: raw inputs ${signedUnits(switched.delta)}`
                                  : 'Switched: same raw inputs value'}
                              </p>
                            ) : null}
                            <RecipeSwitch step={step} preview={preview(step)} onSwitch={onSwitch} />
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
    <section id="planHold" aria-labelledby="planHoldTitle" className="relative mt-4 pt-3 sm:pt-0 sm:pl-9 scroll-mt-40">
      {/* The spine lands on the hold: the column grows out of it (on phones, onto the card's top edge). */}
      <span
        aria-hidden="true"
        className="absolute left-[15px] -top-4 h-6 sm:h-8 w-px bg-linear-to-b from-slate-800 to-cyan-400/60"
      />
      <span
        aria-hidden="true"
        className="absolute z-10 left-[7px] top-[3px] sm:top-4 w-[17px] h-[17px] rounded-full border border-cyan-400/70 bg-slate-950 flex items-center justify-center"
      >
        <i className="ph-bold ph-arrow-up text-[10px] text-cyan-300" />
      </span>
      <div className="rounded-2xl border border-slate-700/80 bg-slate-950/70 p-3 pt-4 sm:p-5">
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
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-1.5 sm:gap-2 mt-4">
          {plan.raw.map(entry => {
            const key = rawKey(entry.title, entry.qty);
            const checked = ticked.has(key);
            return (
              <li key={entry.title} data-raw={entry.title} data-qty={entry.qty}>
                <label
                  className={`relative flex flex-col justify-between aspect-square rounded-lg border p-2 cursor-pointer transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan-300 ${
                    checked
                      ? 'border-emerald-400/70 bg-emerald-500/10'
                      : 'border-slate-700 bg-[linear-gradient(160deg,rgba(30,41,59,0.55),rgba(2,6,23,0.9))] hover:border-slate-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      onToggle(key);
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
                        checked ? 'bg-emerald-400 border-emerald-300 text-emerald-950' : 'border-slate-600'
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
