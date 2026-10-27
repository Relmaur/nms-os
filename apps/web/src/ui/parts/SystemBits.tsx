// Small pieces of a system's look, shared by screens (ported from the string helpers in app/systems.js).
import { OUTLAW_TAG, STAR_CLASSES, type System } from '@atlas/core/systems-model';
import { copyGlyphs } from '../../app/systems.js';

export function StarDot({ system, size = 'w-3 h-3' }: { system: System; size?: string }) {
  const star = system.star ? STAR_CLASSES[system.star] : undefined;
  return (
    <span
      className={`${size} shrink-0 rounded-full ${star ? '' : 'border border-dashed border-slate-600'}`}
      style={star ? { background: star.color, boxShadow: `0 2px 8px -1px ${star.color}88` } : undefined}
      title={star?.label ?? 'Star colour unknown'}
    />
  );
}

export function GlyphChip({ glyphs }: { glyphs: string }) {
  if (!glyphs) return null;
  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        copyGlyphs(glyphs);
      }}
      title="Copy portal glyphs"
      className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-slate-950 border border-slate-700 hover:border-slate-500 font-mono text-[11px] tracking-wider text-slate-200"
    >
      {glyphs}
      <i className="ph-bold ph-copy text-slate-400" />
    </button>
  );
}

export function TagChip({ tag }: { tag: string }) {
  const tone =
    tag === OUTLAW_TAG
      ? 'bg-red-500/10 border-red-500/30 text-red-200'
      : 'bg-slate-900 border-slate-700 text-slate-300';
  return (
    <span className={`inline-flex items-center h-6 px-2 rounded-md border text-[11px] font-medium ${tone}`}>{tag}</span>
  );
}
