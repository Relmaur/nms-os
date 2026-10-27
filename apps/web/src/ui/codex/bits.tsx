// Small pieces the Codex views share: source and status badges, highlighted search text, category labels.
import { CATEGORIES, SOURCES, highlight } from '@atlas/core/search';

const BADGE = 'px-1.5 py-0.5 rounded border text-[10px] font-mono leading-none';

export function SourceBadge({ source }: { source: string | undefined }) {
  const meta = SOURCES[source ?? ''] ?? SOURCES.custom;
  return meta ? <span className={`${BADGE} ${meta.classes}`}>{meta.badge}</span> : null;
}

export function StatusBadge({ entry }: { entry: { obsolete?: boolean; removed?: boolean } }) {
  if (entry.removed) return <span className={`${BADGE} text-rose-300 bg-rose-500/10 border-rose-500/30`}>removed</span>;
  if (entry.obsolete)
    return <span className={`${BADGE} text-slate-300 bg-slate-500/10 border-slate-500/40`}>obsolete</span>;
  return null;
}

// highlight() escapes the text before wrapping matches in <mark>, so its output is safe to set as HTML.
export function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  return tokens.length ? <span dangerouslySetInnerHTML={{ __html: highlight(text, tokens) }} /> : <>{text}</>;
}

export const categoryLabel = (category: string): string => CATEGORIES[category]?.label ?? category;
export const categoryIcon = (category: string): string => CATEGORIES[category]?.icon ?? 'ph-file-text';

export const formatDate = (iso: string | undefined): string =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
