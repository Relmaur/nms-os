// Small pure helpers shared by the app modules and their tests.

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Record ids end up inside inline handlers (onclick="openSystem('<id>')"), where the browser decodes HTML escapes
// before running the code, so escaping can't make an arbitrary id safe. Ids are restricted to these characters.
export const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

// Text from loosely typed input (hand-edited files, old exports), the two ways the normalisers have always read it:
// asString() keeps every value but null/undefined (0 → "0"); toText() falls back for any empty value (0 → fallback).
/* eslint-disable @typescript-eslint/no-base-to-string -- deliberate: any value becomes text, as before */
export function asString(value: unknown): string {
  return String(value ?? '');
}
export function toText(value: unknown, fallback = ''): string {
  return String(value || fallback);
}
/* eslint-enable @typescript-eslint/no-base-to-string */

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: unknown): string {
  return asString(value).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch] ?? ch);
}
