// Time and duration formatting (pure; `now` is injectable for tests).

export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
  return `${Math.round(hours / 24)}d`;
}

export function formatAgo(iso: string, now = Date.now()): string {
  const ms = now - Date.parse(iso);
  return ms < 60000 ? 'just now' : `${formatDuration(ms)} ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// A running timer: 4:05 under an hour (seconds matter when a refiner is nearly done), 1h 05m above.
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) return `${String(hours)}h ${String(minutes).padStart(2, '0')}m`;
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}

// A running clock for elapsed time, to the second: 00:00:01, 01:24:09.
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
