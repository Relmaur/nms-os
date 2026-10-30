// Where an item comes from, read from its mirrored article's Source section (design 34's peek leads with it). The
// wiki writes that section as prose bullets plus one line per recipe; the prose is kept as written ("found"), never
// sorted into guessed kinds, and recipe lines are keyed by the machine that makes them.
export type SourceKind = 'found' | 'refine' | 'craft' | 'cook' | 'dismantle' | 'repair';
export interface SourceLine {
  kind: SourceKind;
  text: string;
}

const HEADING = /^## (Source|Sources|Acquisition|Obtaining)\s*$/m;
const MACHINES: Record<string, SourceKind> = {
  Refiner: 'refine',
  Crafting: 'craft',
  'Nutrient Processor': 'cook',
  Dismantle: 'dismantle',
  Repair: 'repair'
};

// Markdown to the plain words a reader sees: [[Page|label]] → label, bold and italics unmarked, tags dropped.
const plain = (text: string): string =>
  text
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, page: string, label?: string) => label ?? page)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*|__|\*|_/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function sourceLines(markdown: string): SourceLine[] {
  const start = HEADING.exec(markdown);
  if (!start) return [];
  const rest = markdown.slice(start.index + start[0].length);
  const end = rest.search(/^## /m);
  const lines: SourceLine[] = [];
  for (const raw of (end === -1 ? rest : rest.slice(0, end)).split('\n')) {
    const line = raw.replace(/^\s*[-*]\s+/, '').trim();
    if (!line || line.startsWith('|') || line.startsWith('#')) continue;
    const machine = /^\*\*([^*]+)\*\*\s*·\s*(.*)$/.exec(line);
    if (machine) {
      const [, name = '', detail = ''] = machine;
      const kind = MACHINES[name];
      if (!kind) continue; // "(obsolete)" recipes and anything unknown
      // "*Gas Transfer* · 0.36 s per unit: 3 × [[Radon]] → 1 × Nitrogen" → the recipe itself; "needs the blueprint" stays.
      const recipe = detail.includes(':') ? detail.slice(detail.lastIndexOf(':') + 1) : detail;
      const blueprint = /needs the blueprint/.test(detail) ? ' (blueprint)' : '';
      lines.push({ kind, text: plain(recipe) + blueprint });
    } else {
      const text = plain(line);
      if (text) lines.push({ kind: 'found', text });
    }
  }
  return lines;
}

/** The article's body after its frontmatter. */
export const articleBody = (file: string): string => file.replace(/^---\n[\s\S]*?\n---\n/, '');
