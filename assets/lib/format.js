// Time and duration formatting (pure; `now` is injectable for tests).

export function formatDuration(ms) {
    const minutes = Math.max(1, Math.round(ms / 60000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
    return `${Math.round(hours / 24)}d`;
}

export function formatAgo(iso, now = Date.now()) {
    const ms = now - Date.parse(iso);
    return ms < 60000 ? 'just now' : `${formatDuration(ms)} ago`;
}

export function formatDate(iso) {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
