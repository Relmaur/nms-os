// Small pure helpers shared by the app modules and their tests.

export function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Record ids end up inside inline handlers (onclick="openSystem('<id>')"), where the browser decodes HTML escapes
// before running the code, so escaping can't make an arbitrary id safe. Ids are restricted to these characters.
export const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
