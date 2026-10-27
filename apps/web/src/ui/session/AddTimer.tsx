// Add a timer: a refiner run (its time is the wiki's refining time × whole batches), a crop (your harvest time,
// remembered per crop) or anything else (your time).
import { useMemo, useState } from 'react';
import { formatCountdown } from '@atlas/core/format';
import {
  MAX_TIMER_MS,
  lastCropMinutes,
  recipeInputs,
  refineDuration,
  refineOptions,
  type TimerKind
} from '@atlas/core/timers';
import { addTimer } from '../actions.ts';
import { useGameData } from '../calculators/game-data.ts';
import { useAppState } from '../useAppState.ts';
import { askToNotify } from './timer-runner.ts';

const FIELD =
  'w-full h-11 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 text-base md:text-sm text-white placeholder:text-slate-500 focus:outline-hidden';
const KINDS: [TimerKind, string, string][] = [
  ['refine', 'Refiner', 'ph-flask'],
  ['crop', 'Crop', 'ph-plant'],
  ['custom', 'Custom', 'ph-timer']
];
const QUICK = [5, 15, 30, 60];

export function AddTimer() {
  const [kind, setKind] = useState<TimerKind>('refine');
  return (
    <section aria-labelledby="addTimerHeading" className="space-y-3">
      <h3 id="addTimerHeading" className="panel-heading">
        Add a timer
      </h3>
      <div role="group" aria-label="Kind of timer" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900 p-1">
        {KINDS.map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            aria-pressed={kind === key}
            onClick={() => {
              setKind(key);
            }}
            className="kind-tab"
          >
            <i className={`ph-bold ${icon}`} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {kind === 'refine' ? <RefineForm /> : <TimedForm key={kind} kind={kind} />}
    </section>
  );
}

function start(kind: TimerKind, label: string, ms: number): void {
  askToNotify(); // from this tap, the one place a browser lets the app ask
  addTimer(kind, label, ms);
}

function RefineForm() {
  const data = useGameData();
  const options = useMemo(() => (data.status === 'ready' ? refineOptions(data.catalog.byTitle.values()) : []), [data]);
  const [name, setName] = useState('');
  const [pick, setPick] = useState(0);
  const [amount, setAmount] = useState('250');
  const option = options.find(item => item.title.toLowerCase() === name.trim().toLowerCase());
  const recipe = option?.recipes[Math.min(pick, option.recipes.length - 1)];
  const qty = Math.floor(Number(amount));
  const ms = recipe ? refineDuration(recipe, qty) : null;
  const tooLong = ms !== null && ms > MAX_TIMER_MS;

  if (data.status === 'failed')
    return (
      <p className="text-sm text-amber-200">
        The wiki’s recipes couldn’t be loaded, so refiner times aren’t available. Use a custom timer.
      </p>
    );
  return (
    <form
      className="space-y-3"
      onSubmit={event => {
        event.preventDefault();
        if (!option || ms === null) return;
        start('refine', `${qty.toLocaleString()} ${option.title}`, ms);
        setName('');
      }}
    >
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <label className="block">
          <span className="block text-xs text-slate-400 mb-1">What it makes</span>
          <input
            type="text"
            list="refineItems"
            value={name}
            onChange={event => {
              setName(event.target.value);
              setPick(0);
            }}
            placeholder={data.status === 'ready' ? 'Pick what it makes' : 'Loading recipes…'}
            autoComplete="off"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="block text-xs text-slate-400 mb-1">Amount made</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={amount}
            onChange={event => {
              setAmount(event.target.value);
            }}
            className={`${FIELD} font-mono tabular-nums`}
          />
        </label>
      </div>
      <datalist id="refineItems">
        {options.map(item => (
          <option key={item.title} value={item.title} />
        ))}
      </datalist>
      {option && option.recipes.length > 1 && (
        <label className="block">
          <span className="block text-xs text-slate-400 mb-1">Recipe</span>
          <select
            value={pick}
            onChange={event => {
              setPick(Number(event.target.value));
            }}
            className={FIELD}
          >
            {option.recipes.map((item, i) => (
              <option key={i} value={i}>
                {recipeInputs(item)}
              </option>
            ))}
          </select>
        </label>
      )}
      {recipe && ms !== null && (
        <p className="text-xs text-slate-400">
          <span className="font-mono text-cyan-300 tabular-nums">{formatCountdown(ms)}</span> from{' '}
          {recipeInputs(recipe)}, at the wiki’s refining time ({String(recipe.seconds)} s per unit made).
        </p>
      )}
      {name.trim() && !option && data.status === 'ready' && (
        <p className="text-xs text-slate-400">Pick something a refiner makes from the list.</p>
      )}
      {tooLong && <TooLong />}
      <button type="submit" disabled={!option || ms === null || tooLong} className="start-timer">
        <i className="ph-bold ph-play" aria-hidden="true" /> Start refiner timer
      </button>
    </form>
  );
}

function TimedForm({ kind }: { kind: 'crop' | 'custom' }) {
  const { timers } = useAppState();
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('');
  const crop = kind === 'crop';
  const total = Number(minutes);
  const tooLong = total * 60_000 > MAX_TIMER_MS;
  const valid = name.trim() !== '' && total > 0 && !tooLong;
  return (
    <form
      className="space-y-3"
      onSubmit={event => {
        event.preventDefault();
        if (!valid) return;
        start(kind, name.trim(), total * 60_000);
        setName('');
        setMinutes('');
      }}
    >
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <label className="block">
          <span className="block text-xs text-slate-400 mb-1">{crop ? 'Crop' : 'Name'}</span>
          <input
            type="text"
            value={name}
            onChange={event => {
              setName(event.target.value);
              // A crop starts from the time you last set for it.
              const last = crop ? lastCropMinutes(timers, event.target.value) : null;
              if (last !== null) setMinutes(String(last));
            }}
            placeholder={crop ? 'Crop name' : 'What you’re waiting on'}
            autoComplete="off"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="block text-xs text-slate-400 mb-1">Minutes</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={minutes}
            onChange={event => {
              setMinutes(event.target.value);
            }}
            className={`${FIELD} font-mono tabular-nums`}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick times">
        {QUICK.map(value => (
          <button
            key={value}
            type="button"
            aria-pressed={total === value}
            onClick={() => {
              setMinutes(String(value));
            }}
            className="quick-chip"
          >
            {value < 60 ? `${String(value)}m` : '1h'}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        {crop
          ? 'Your harvest time: the wiki only gives it in prose, so you set it, and the next one starts from it.'
          : 'Your time, for anything: a frigate mission, a settlement job, a storm.'}
      </p>
      {tooLong && <TooLong />}
      <button type="submit" disabled={!valid} className="start-timer">
        <i className="ph-bold ph-play" aria-hidden="true" /> {crop ? 'Start crop timer' : 'Start timer'}
      </button>
    </form>
  );
}

function TooLong() {
  return <p className="text-xs text-amber-200">A timer can run up to 30 days.</p>;
}
