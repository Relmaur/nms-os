// Calculators: a dock switches between the recipe planner (first, and the default) and the small tools: the best
// crafts for money, a haul's base value, mineral extractors and Harmonic Camp registers.
// Recipes and values come from the wiki mirror; anything the wiki can't know is an input the player sets.
import { useMemo, useState, type SubmitEvent } from 'react';
import { evaluateRegister, extractorYield, formatQty, formatUnits, haulValue } from '@atlas/core/calc';
import { findItem, type Catalog } from '@atlas/core/planner';
import { showToast } from '../../app/ui.ts';
import { useGameData, type GameDataState } from './game-data.ts';
import { Planner } from './Planner.tsx';
import { BestCrafts } from './BestCrafts.tsx';
import { panelId, tabId, ToolDock } from './ToolDock.tsx';
import { useTool, type Tool } from './tool-store.ts';

const VALUE_DEFAULTS = ['Radiant Shard', 'Inverted Mirror', 'Hyaline Brain']; // Sentinel salvage
const REGISTER_DEFAULTS = ['6 - 2', '2 + 8', '11 + 5'];

export function Calculators() {
  const data = useGameData();
  const tool = useTool();
  const [summary, setSummary] = useState('');
  const catalog = data.status === 'ready' ? data.catalog : null;
  // Every tool stays mounted, so switching never loses what was typed in another.
  const panel = (id: Tool) => ({
    id: panelId(id),
    role: 'tabpanel',
    // The planner's tab also carries the live summary; its panel is named by its own heading, which doesn't change.
    'aria-labelledby': id === 'planner' ? 'calcPlanHeading' : tabId(id),
    hidden: tool !== id
  });
  return (
    <>
      <div className="max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-white">Calculators</h1>
        {/* On a phone the planner's answer needs the first screen, so the intro shows from sm up. */}
        <p className="hidden sm:block text-sm text-slate-300 mt-1.5">
          Recipes and values come from the wiki mirror, so they match the wiki exactly. Anything the wiki can’t know,
          like your extractor’s output, is an input you set.
        </p>
        <SourceLine data={data} />
      </div>

      <ToolDock summary={data.status === 'ready' ? summary : data.status === 'failed' ? '' : 'Loading recipes…'} />

      {/* One wrapper, so the hidden panels never sit last in the page's space-y list (which would add a gap). */}
      <div>
        <div {...panel('planner')} className="hud-card rounded-2xl px-4 sm:px-5 pb-4 sm:pb-5">
          {/* The dock names the planner on screen; this heading keeps the outline (h1, h2, then the capstone's h3). */}
          <h2 id="calcPlanHeading" className="sr-only">
            Recipe planner
          </h2>
          {data.status === 'ready' ? (
            <Planner catalog={data.catalog} onSummary={setSummary} />
          ) : (
            <p className="pt-4 sm:pt-5 text-sm text-slate-400">
              {data.status === 'failed' ? 'No wiki data yet.' : 'Loading recipes…'}
            </p>
          )}
        </div>
        <div {...panel('profit')} className="max-w-3xl">
          {data.status === 'ready' ? (
            <BestCrafts catalog={data.catalog} />
          ) : (
            <p className="text-sm text-slate-400">
              {data.status === 'failed' ? 'No wiki data yet.' : 'Loading recipes…'}
            </p>
          )}
        </div>
        <div {...panel('value')} className="max-w-3xl space-y-4">
          <BaseValue catalog={catalog} />
          <p className="text-xs text-slate-400 px-1">
            Outlaw run estimates use your own packet price and yield, since neither is fixed game data: set them in{' '}
            <a href="#outlaw" className="text-emerald-300 hover:text-emerald-200">
              Outlaw Run
            </a>
            , then Run settings.
          </p>
        </div>
        <div {...panel('extractors')} className="max-w-3xl">
          <Extractors catalog={catalog} />
        </div>
        <div {...panel('registers')} className="max-w-3xl">
          <Registers />
        </div>
      </div>
    </>
  );
}

function SourceLine({ data }: { data: GameDataState }) {
  if (data.status === 'failed')
    return (
      <p id="calcSource" role="alert" className="text-xs text-amber-200 mt-2">
        The wiki data couldn’t be loaded. Check your connection, then open Calculators again.
      </p>
    );
  if (data.status !== 'ready')
    return (
      <p id="calcSource" className="text-xs text-slate-400 mt-2">
        Loading the wiki data…
      </p>
    );
  const v = data.verification;
  const pages = data.catalog.pages.toLocaleString();
  const checked = v?.status === 'match' ? new Date(v.checkedAt) : null;
  // One line on a phone, so the planner's answer keeps the first screen.
  return (
    <p id="calcSource" className="text-xs text-slate-400 mt-2">
      <span className="sm:hidden">
        {`${pages} wiki pages${checked ? ` · verified ${checked.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''} · `}
      </span>
      <span className="hidden sm:inline">
        {`Using ${pages} wiki pages${
          checked
            ? `, verified against the wiki on ${checked.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
            : ''
        }. `}
      </span>
      <a href="wiki/" className="text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1">
        <span className="hidden sm:inline">Open the</span> Codex
        <i className="ph-bold ph-arrow-right" aria-hidden="true" />
      </a>
    </p>
  );
}

const valuable = (catalog: Catalog) =>
  [...catalog.byTitle.values()]
    .filter(item => !item.obsolete && (item.value ?? 0) > 0)
    .sort((a, b) => a.title.localeCompare(b.title));

function BaseValue({ catalog }: { catalog: Catalog | null }) {
  const [rows, setRows] = useState(VALUE_DEFAULTS.map(title => ({ title, qty: 1 })));
  const [adding, setAdding] = useState('');
  const options = useMemo(() => (catalog ? valuable(catalog) : []), [catalog]);
  const value = (title: string) => (catalog ? findItem(catalog, title)?.value : undefined);
  const add = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const item = catalog ? findItem(catalog, adding) : undefined;
    if (!item?.value) {
      showToast(item ? `${item.title} has no value on the wiki.` : 'Pick an item from the list.');
      return;
    }
    setRows(current =>
      current.some(row => row.title === item.title)
        ? current.map(row => (row.title === item.title ? { ...row, qty: row.qty + 1 } : row))
        : [...current, { title: item.title, qty: 1 }]
    );
    setAdding('');
  };
  const total = haulValue(rows.map(row => ({ qty: row.qty, value: value(row.title) })));
  return (
    <div className="hud-card rounded-2xl p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
          <i className="ph-bold ph-coins text-amber-300" />
          Base value
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          What a haul is worth at the wiki’s base values, e.g. Sentinel salvage. Terminals pay more or less depending on
          the system’s economy.
        </p>
      </div>
      <ul id="valueRows" className="space-y-1.5">
        {rows.length ? (
          rows.map((row, i) => {
            const each = value(row.title);
            return (
              <li key={row.title} className="flex items-center gap-2">
                <span className="flex-1 min-w-0 truncate text-sm text-white">
                  {row.title}{' '}
                  <span className="text-xs text-slate-400">{each ? `${formatUnits(each)} each` : 'no value'}</span>
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={row.qty || ''} // a cleared field stays empty while the next digit is typed
                  onChange={event => {
                    const qty = Math.max(0, Math.round(Number(event.target.value)) || 0);
                    setRows(current => current.map((item, j) => (j === i ? { ...item, qty } : item)));
                  }}
                  aria-label={`How many ${row.title}`}
                  className="w-20 h-9 bg-slate-900 border border-slate-700 rounded-lg px-2 text-right text-base sm:text-sm text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRows(current => current.filter((_, j) => j !== i));
                  }}
                  aria-label={`Remove ${row.title}`}
                  className="w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
                >
                  <i className="ph-bold ph-x" />
                </button>
              </li>
            );
          })
        ) : (
          <li className="text-sm text-slate-400">Add items to total them up.</li>
        )}
      </ul>
      <form className="flex gap-2" onSubmit={add}>
        <input
          id="valueAdd"
          list="valueItemOptions"
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={adding}
          onChange={event => {
            setAdding(event.target.value);
          }}
          placeholder="Add an item"
          aria-label="Add an item"
          className="flex-1 min-w-0 h-10 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base sm:text-sm text-white placeholder:text-slate-400"
        />
        <button
          type="submit"
          className="h-10 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-sm text-slate-100"
        >
          Add
        </button>
        <datalist id="valueItemOptions">
          {options.map(item => (
            <option key={item.title} value={item.title} />
          ))}
        </datalist>
      </form>
      {rows.length && catalog ? (
        <p id="valueTotal" className="text-sm text-slate-300">
          Total: <strong className="font-mono text-amber-200">{formatUnits(total)} Units</strong>
        </p>
      ) : null}
    </div>
  );
}

function Extractors({ catalog }: { catalog: Catalog | null }) {
  const minerals = useMemo(
    () => (catalog ? valuable(catalog).filter(item => item.category === 'resources') : []),
    [catalog]
  );
  const [mineral, setMineral] = useState('Gold');
  const [count, setCount] = useState('1');
  const [rate, setRate] = useState('');
  // Gold by default; if the wiki data ever lacks it, the first mineral it has.
  const item = minerals.find(option => option.title === mineral) ?? minerals[0];
  const extractors = Math.max(1, Math.round(Number(count)) || 1);
  const perHourEach = Number(rate);
  const result = item?.value && perHourEach > 0 ? extractorYield(extractors, perHourEach, item.value) : null;
  return (
    <div className="hud-card rounded-2xl p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
          <i className="ph-bold ph-mountains text-emerald-300" />
          Mineral extractors
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Output depends on the deposit, so enter the rate your extractor shows in game. The mineral’s value comes from
          the wiki.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="field">
          Mineral
          <select
            id="mineMineral"
            value={item?.title ?? ''}
            onChange={event => {
              setMineral(event.target.value);
            }}
            className="filter-select w-full mt-1.5"
          >
            {minerals.map(option => (
              <option key={option.title}>{option.title}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Extractors
          <input
            id="mineCount"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={count}
            onChange={event => {
              setCount(event.target.value);
            }}
          />
        </label>
        <label className="field">
          Units/hour each
          <input
            id="mineRate"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="e.g. 250"
            value={rate}
            onChange={event => {
              setRate(event.target.value);
            }}
          />
        </label>
      </div>
      <p id="mineResult" className="text-sm text-slate-300">
        {!item?.value ? null : result ? (
          <>
            <strong className="font-mono text-white">{formatQty(result.perHour)}</strong>
            {` ${item.title} per hour, worth `}
            <strong className="font-mono text-emerald-300">{formatUnits(result.unitsPerHour)} Units</strong>
            {` (${formatUnits(result.unitsPerDay)} a day) at the base value of ${formatUnits(item.value)} each.`}
          </>
        ) : (
          `${item.title} is worth ${formatUnits(item.value)} Units each. Enter your extractor’s hourly rate to see the yield.`
        )}
      </p>
    </div>
  );
}

function Registers() {
  const [exprs, setExprs] = useState(REGISTER_DEFAULTS);
  return (
    <div className="hud-card rounded-2xl p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
          <i className="ph-bold ph-terminal-window text-purple-300" />
          Harmonic Camp registers
        </h2>
        <p className="text-xs text-slate-400 mt-1">Type each register’s expression to get the override code.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {exprs.map((expr, i) => (
          <label key={i} className="field">
            Register {i + 1}
            <input
              type="text"
              id={`calcReg${String(i + 1)}`}
              value={expr}
              onChange={event => {
                setExprs(current => current.map((item, j) => (j === i ? event.target.value : item)));
              }}
              className="font-mono"
            />
            <output
              id={`calcAns${String(i + 1)}`}
              className="block font-display font-bold text-lg text-purple-300 text-right mt-1"
            >
              {evaluateRegister(expr)}
            </output>
          </label>
        ))}
      </div>
    </div>
  );
}
