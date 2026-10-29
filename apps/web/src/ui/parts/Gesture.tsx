// Gesture buttons (DESIGN.md, Gesture buttons; component c04, part 2), for the few moments that should feel like the
// game: slide to activate (Home's "Warped somewhere new"), hold to activate (Home's "Start session") and tap to arm
// (destructive actions that can't be undone). Nowhere else: the shell and settings stay classic tap buttons.
//
// A stray tap never fires a slide or a hold: that's their point, safe from a pocket or a thumb mid-game. Keyboards
// and screen readers get one deliberate action instead. A click with `detail === 0` comes from the keyboard or
// assistive tech (a pointer click counts its taps from 1), so it activates directly.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

export type GestureTone = 'emerald' | 'cyan';

const SLIDE_DONE_AT = 0.85; // of the knob's travel
const SLIDE_RESULT_MS = 1200;
const SPRING_MS = 220;
export const HOLD_MS = 600;
const REWIND_MS = 150;
export const ARM_MS = 3000;

const KNOB = 48;
const INSET = 5; // the knob's gap to the track on every side

// A short buzz where the platform has one (Android); iOS has no web vibration, so it just doesn't happen.
function haptic(pattern: number | number[]): void {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}
function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** How far a knob dragged to `x` of `max` has travelled (0–1), and whether letting go there completes the slide. */
export function slideProgress(x: number, max: number): { progress: number; completes: boolean } {
  const progress = max > 0 ? Math.min(1, Math.max(0, x / max)) : 0;
  return { progress, completes: progress >= SLIDE_DONE_AT };
}

const SLIDE_TONE: Record<GestureTone, { track: string; knob: string; trail: string }> = {
  emerald: {
    track: 'bg-[rgba(16,185,129,0.1)] border-[rgba(52,211,153,0.45)] text-ready-emerald-text',
    knob: 'bg-ready-emerald text-ready-emerald-ink',
    trail: 'bg-[linear-gradient(90deg,rgba(16,185,129,0.08),rgba(16,185,129,0.35))]'
  },
  cyan: {
    track: 'bg-[rgba(34,211,238,0.08)] border-[rgba(34,211,238,0.4)] text-quantity-cyan',
    knob: 'bg-scanner-cyan-glow text-scanner-cyan-ink',
    trail: 'bg-[linear-gradient(90deg,rgba(34,211,238,0.06),rgba(34,211,238,0.3))]'
  }
};

interface SlideProps {
  /** What the track says: "Warped somewhere new". */
  label: string;
  /** What it does, for its accessible name: "log a new system" → "Warped somewhere new: slide or activate to log a new system". */
  action: string;
  onActivate: () => void;
  /** What the track says for a moment after it fires ("Logged · Euclid"); the label by default. */
  result?: string;
  tone?: GestureTone;
  /** Says why it can't be used yet ("Log a system first"); the track goes slate and doesn't move. */
  disabled?: string;
}

export function SlideToActivate({ label, action, onActivate, result, tone = 'emerald', disabled }: SlideProps) {
  const track = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ startX: number; from: number } | null>(null);
  const [x, setX] = useState(0);
  const [travel, setTravel] = useState(0); // measured when a drag starts, so render never reads the track
  const [springing, setSpringing] = useState(false);
  const [done, setDone] = useState(false);
  const max = () => (track.current ? track.current.clientWidth - KNOB - INSET * 2 : 0);

  // After the result has shown, the slide goes back to rest, ready for the next warp.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => {
      setDone(false);
      setX(0);
    }, SLIDE_RESULT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [done]);

  const complete = () => {
    if (done || disabled) return;
    setX(max());
    setDone(true);
    haptic([12, 40, 12]);
    onActivate();
  };
  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (done || disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, from: x };
    setTravel(max());
    setSpringing(false);
  };
  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (!drag.current) return;
    setX(Math.min(max(), Math.max(0, drag.current.from + event.clientX - drag.current.startX)));
  };
  const onPointerEnd = () => {
    if (!drag.current) return;
    drag.current = null;
    if (slideProgress(x, max()).completes) complete();
    else {
      setSpringing(!reducedMotion());
      setX(0);
    }
  };

  const { progress } = slideProgress(x, travel);
  const colours = SLIDE_TONE[tone];
  return (
    <button
      ref={track}
      type="button"
      disabled={Boolean(disabled)}
      // Leads with the visible words (WCAG 2.5.3), so voice control finds it by what it says.
      aria-label={disabled ? `${label}: ${disabled}` : `${label}: slide or activate to ${action}`}
      onClick={event => {
        if (event.detail === 0) complete();
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          complete();
        }
      }}
      className={`relative isolate block w-full h-[60px] overflow-hidden rounded-full border text-button font-bold select-none touch-pan-y ${
        disabled ? 'bg-slate-ground border-control-edge text-ink-disabled cursor-not-allowed' : colours.track
      }`}
    >
      {!disabled && (
        <span
          aria-hidden="true"
          className={`absolute left-1 top-1 bottom-1 rounded-full ${colours.trail}`}
          style={{
            width: `${String(x + KNOB + 2)}px`,
            transition: springing ? `width ${String(SPRING_MS)}ms var(--ease-entrance)` : 'none'
          }}
        />
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center gap-2.5 pl-11"
        style={{ opacity: done ? 1 : 1 - progress * 0.85 }}
      >
        {disabled ?? (done ? (result ?? label) : label)}
        {!disabled && !done && (
          <span className="inline-flex text-xs">
            <i className="ph-bold ph-caret-right opacity-35" />
            <i className="ph-bold ph-caret-right opacity-60 -ml-1" />
            <i className="ph-bold ph-caret-right opacity-90 -ml-1" />
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        data-knob
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className={`absolute top-[5px] w-12 h-12 rounded-full grid place-items-center text-xl touch-none ${
          disabled ? 'bg-hairline text-ink-disabled' : `${colours.knob} cursor-grab active:cursor-grabbing`
        }`}
        style={{
          left: `${String(INSET + x)}px`,
          transition: springing ? `left ${String(SPRING_MS)}ms var(--ease-entrance)` : 'none'
        }}
        onTransitionEnd={() => {
          setSpringing(false);
        }}
      >
        <i className={`ph-bold ${done ? 'ph-check' : 'ph-arrow-right'}`} />
      </span>
    </button>
  );
}

const HOLD_TONE: Record<
  GestureTone,
  { track: string; core: string; ring: string; ringTrack: string; hint: string; fill: string }
> = {
  cyan: {
    track: 'bg-[rgba(34,211,238,0.08)] border-[rgba(34,211,238,0.4)] text-scanner-cyan-text',
    core: 'bg-scanner-cyan-glow text-scanner-cyan-ink',
    ring: '#67e8f9',
    ringTrack: 'rgba(103,232,249,0.2)',
    hint: 'text-quantity-cyan',
    fill: 'bg-[linear-gradient(90deg,rgba(34,211,238,0.05),rgba(34,211,238,0.22))]'
  },
  emerald: {
    track: 'bg-[rgba(16,185,129,0.1)] border-[rgba(52,211,153,0.45)] text-ready-emerald-bright',
    core: 'bg-ready-emerald text-ready-emerald-ink',
    ring: '#6ee7b7',
    ringTrack: 'rgba(110,231,183,0.2)',
    hint: 'text-[#86efac]',
    fill: 'bg-[linear-gradient(90deg,rgba(16,185,129,0.05),rgba(16,185,129,0.22))]'
  }
};
const RING = 2 * Math.PI * 21;

interface HoldProps {
  id?: string;
  label: string;
  /** The line under the label: what holding will do ("Counts systems, visits and timers until you stop"). */
  hint: string;
  onActivate: () => void;
  tone?: GestureTone;
  /** Once what it started is running: shown full and checked, and no longer pressable. */
  done?: { label: string; hint: ReactNode } | undefined;
}

export function HoldToActivate({ id, label, hint, onActivate, tone = 'cyan', done }: HoldProps) {
  const [progress, setShownProgress] = useState(0);
  const current = useRef(0); // the same value, readable when a release has to rewind from it
  const setProgress = (value: number) => {
    current.current = value;
    setShownProgress(value);
  };
  const frame = useRef(0);
  const holding = useRef(false);
  const fired = useRef(false);
  const rest = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(rest.current);
    },
    []
  );

  // Progress moves by the clock, frame by frame: filling over HOLD_MS while held, rewinding over REWIND_MS when let
  // go early. It's feedback, not decoration, so it runs under reduced motion too.
  const run = (from: number, to: number, ms: number, end?: () => void) => {
    cancelAnimationFrame(frame.current);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setProgress(from + (to - from) * t);
      if (t < 1) frame.current = requestAnimationFrame(step);
      else end?.();
    };
    frame.current = requestAnimationFrame(step);
  };
  const fire = () => {
    if (fired.current) return;
    fired.current = true;
    holding.current = false;
    setProgress(1);
    haptic([12, 40, 12]);
    onActivate();
    // Full for a beat, then back to rest; a `done` state, if the caller sets one, shows full regardless.
    rest.current = setTimeout(() => {
      setProgress(0);
    }, REWIND_MS * 2);
  };
  const press = () => {
    if (done || holding.current) return;
    holding.current = true;
    fired.current = false;
    haptic(8);
    run(0, 1, HOLD_MS, fire);
  };
  const release = () => {
    if (!holding.current) return;
    holding.current = false;
    run(current.current, 0, REWIND_MS * current.current);
  };

  const colours = HOLD_TONE[tone];
  const shown = done ? 1 : progress;
  return (
    <button
      id={id}
      type="button"
      aria-disabled={done ? true : undefined}
      onPointerDown={event => {
        if (event.button === 0) press();
      }}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onContextMenu={event => {
        event.preventDefault(); // a long press would open the system's menu instead
      }}
      onKeyDown={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!event.repeat) press();
      }}
      onKeyUp={event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        release();
      }}
      onClick={event => {
        if (event.detail !== 0 || done) return;
        fired.current = false; // one press from assistive tech is the whole gesture
        fire();
      }}
      className={`relative isolate w-full h-[60px] overflow-hidden rounded-full border flex items-center justify-between pl-[22px] pr-2 text-left text-button font-bold select-none [-webkit-touch-callout:none] ${colours.track}`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 -z-10 ${colours.fill}`}
        style={{ width: `${String(shown * 100)}%` }}
      />
      <span className="flex flex-col gap-[5px] min-w-0">
        <span>{done ? done.label : label}</span>
        <span className={`text-[11px] leading-[1.2] font-medium opacity-80 ${colours.hint}`}>
          {done ? done.hint : hint}
        </span>
        {!done && <span className="sr-only">, press and hold</span>}
      </span>
      <span aria-hidden="true" className="relative w-[46px] h-[46px] shrink-0">
        <svg width="46" height="46" viewBox="0 0 46 46" className="absolute inset-0">
          <circle cx="23" cy="23" r="21" fill="none" stroke={colours.ringTrack} strokeWidth="2.5" />
          <circle
            cx="23"
            cy="23"
            r="21"
            fill="none"
            stroke={colours.ring}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - shown)}
            transform="rotate(-90 23 23)"
          />
        </svg>
        <span className={`absolute inset-[5px] rounded-full grid place-items-center ${colours.core}`}>
          <i className={done ? 'ph-bold ph-check text-xl' : 'ph-fill ph-play text-base'} />
        </span>
      </span>
    </button>
  );
}

interface ArmProps {
  label: string;
  /** What the armed button says: "Tap again to delete". */
  armedLabel: string;
  onConfirm: () => void;
  icon?: string;
}

/** Tap to arm, tap again within 3s to confirm; anything else (the window closing, Esc, focus leaving) disarms. */
export function ArmButton({ label, armedLabel, onConfirm, icon = 'ph-trash' }: ArmProps) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => {
      setArmed(false);
    }, ARM_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [armed]);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!armed) {
            setArmed(true);
            haptic(8);
            return;
          }
          setArmed(false);
          onConfirm();
        }}
        onBlur={() => {
          setArmed(false);
        }}
        onKeyDown={event => {
          if (event.key === 'Escape') setArmed(false);
        }}
        className={`relative isolate w-full h-12 overflow-hidden rounded-button border flex items-center justify-center gap-2 text-sm font-semibold transition-colors duration-[var(--duration-micro)] ${
          armed
            ? 'bg-danger-rose-tint border-danger-rose-edge-armed text-danger-rose-bright'
            : 'bg-slate-ground border-[rgba(251,113,133,0.45)] text-danger-rose-text'
        }`}
      >
        {armed && (
          // The wash drains right to left as the window closes; under reduced motion it stays full until it ends.
          <span
            aria-hidden="true"
            className="arm-wash absolute left-0 top-0 bottom-0 -z-10 bg-[linear-gradient(90deg,rgba(244,63,94,0.06),rgba(244,63,94,0.32))] border-r border-[rgba(253,164,175,0.55)]"
          />
        )}
        {!armed && <i className={`ph-bold ${icon} text-base`} aria-hidden="true" />}
        {armed ? armedLabel : label}
      </button>
      <span className="sr-only" aria-live="polite">
        {armed ? `${armedLabel}, within 3 seconds` : ''}
      </span>
    </>
  );
}
