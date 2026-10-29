// Tap buttons (DESIGN.md, Tap buttons; component c04, part 1): the classic set for the shell, settings and editors.
// Every one is tint and edge or slate; none is filled with solid colour. One primary per view, and labels are verbs.
import type { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'jump' | 'ghost' | 'danger';
export type ButtonSize = 'L' | 'M' | 'S';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-ready-emerald-tint border-ready-emerald-edge text-ready-emerald-text hover:bg-ready-emerald-tint-hover hover:border-ready-emerald-edge-hover active:bg-ready-emerald-tint-pressed active:border-ready-emerald-lit',
  secondary: 'bg-slate-ground border-control-edge text-ink hover:border-control-edge-hover active:bg-panel',
  // Enters a place or a mode (Open timers): cyan, the colour of where you are.
  jump: 'bg-scanner-cyan-tint border-scanner-cyan-edge text-quantity-cyan hover:border-scanner-cyan-edge-strong active:bg-[rgba(34,211,238,0.18)]',
  ghost: 'bg-transparent border-transparent text-scanner-cyan-pale hover:text-quantity-cyan',
  // Reversible destructive actions (Unpair). One that can't be undone uses ArmButton.
  danger: 'bg-slate-ground border-danger-rose-edge text-danger-rose-text hover:bg-danger-rose-tint'
};
// L for the view's main action, M for most, S only in dense rows (it keeps a 44px hit area).
const SIZE: Record<ButtonSize, string> = {
  L: 'h-12 rounded-button text-button gap-2',
  M: 'h-[42px] rounded-control text-control gap-2',
  S: "relative h-[34px] rounded-[10px] text-control gap-1.5 after:absolute after:inset-x-0 after:-inset-y-[5px] after:content-['']"
};
const PAD: Record<ButtonSize, string> = { L: 'px-[18px]', M: 'px-4', S: 'px-3' };
// Disabled is slate, not faded, so it still reads.
const DISABLED =
  'disabled:bg-slate-ground disabled:border-control-edge disabled:text-ink-disabled disabled:cursor-not-allowed';

export function buttonClass(
  variant: ButtonVariant = 'secondary',
  size: ButtonSize = variant === 'primary' ? 'L' : 'M'
) {
  const pad = variant === 'ghost' ? 'px-2.5' : PAD[size];
  return `inline-flex items-center justify-center border transition-colors duration-[var(--duration-micro)] ${VARIANT[variant]} ${SIZE[size]} ${pad} ${DISABLED}`;
}

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A Phosphor icon name (`ph-plus`), drawn bold before the label. */
  icon?: string;
  /** Shows a spinner and this label ("Saving…"), and holds the button disabled. */
  loading?: string;
  disabled?: boolean;
  wide?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  className?: string;
}

export function Button({
  children,
  variant = 'secondary',
  size,
  icon,
  loading,
  disabled,
  wide,
  type = 'button',
  onClick,
  className = ''
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || Boolean(loading)}
      aria-busy={loading ? true : undefined}
      className={`${buttonClass(variant, size)} ${wide ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <>
          <span
            className="w-4 h-4 rounded-full border-2 border-current border-t-transparent opacity-80 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {loading}
        </>
      ) : (
        <>
          {icon && <i className={`ph-bold ${icon} text-base`} aria-hidden="true" />}
          {children}
        </>
      )}
    </button>
  );
}

/** A 42px square slate button; `label` is its accessible name. */
export function IconButton({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-[42px] h-[42px] shrink-0 rounded-control border border-control-edge bg-slate-ground text-ink grid place-items-center hover:border-control-edge-hover transition-colors duration-[var(--duration-micro)]"
    >
      <i className={`ph-bold ${icon} text-xl`} aria-hidden="true" />
    </button>
  );
}
