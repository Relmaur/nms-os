// Waiting and not-found states (the design brief asks for every state; no screen draws these, so they follow its
// parts). Placeholders hold the shape of what's coming, so nothing jumps when it arrives, and appear only after a beat
// (theme.css), so a fast load never flashes them. A failure says what's true for a player, and offers another try.
import type { ReactNode } from 'react';
import { Button } from './Button.tsx';

/** One placeholder shape; its size and radius come from `className`. */
export function Bone({ className = '' }: { className?: string }) {
  return <span className={`bone block ${className}`} />;
}

/** The screen's placeholders, heard as one short status. */
export function LoadingShape({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" className="loading-in flex flex-col gap-4 max-w-2xl">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}

const TILES = Array.from({ length: 12 }, (_, i) => i);

/** The Codex landing's shape: its title, search and group tiles. */
export function CodexLoading() {
  return (
    <LoadingShape label="Loading the Codex">
      <h1 className="font-display text-screen-title text-ink-bright">Codex</h1>
      <Bone className="h-4 w-3/4 rounded" />
      <Bone className="h-11 rounded-control" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TILES.map(i => (
          <Bone key={i} className="h-14 rounded-card" />
        ))}
      </div>
    </LoadingShape>
  );
}

/** A list of rows or cards under a title: the planner and Best crafts. */
export function RowsLoading({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <LoadingShape label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <Bone key={i} className="h-16 rounded-card" />
      ))}
    </LoadingShape>
  );
}

/** Data that couldn't be read. Offline, it hasn't reached this device yet; the log is never at stake. */
export function LoadFailed({ what, onRetry }: { what: string; onRetry: () => void }) {
  const offline = !navigator.onLine;
  return (
    <div
      role="alert"
      className="rounded-card border border-dashed border-control-edge p-6 flex flex-col items-start gap-3 max-w-2xl"
    >
      <h2 className="font-display font-bold text-lg text-ink-bright">
        {offline ? `${what} isn’t on this device yet` : `Couldn’t load ${what.toLowerCase()}`}
      </h2>
      <p className="text-sub text-ink-muted">
        {offline
          ? 'It downloads when you open ATLAS:OS online, then stays for offline. Connect once and try again. Your log is safe here.'
          : 'Something got in the way. Your log is safe here.'}
      </p>
      <Button icon="ph-arrow-clockwise" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
