// A mirrored article as the Codex article screen draws it (design 16): its "## " sections as cards, Quick Facts as
// label/value pairs, and recipe lines ("**Refiner** · *Label* · 0.36 s per unit: 2 × [[Copper]] → 1 × Chromatic
// Metal") as table rows. Pure text work on the Markdown the wiki sync writes; anything it doesn't recognise stays
// Markdown and renders as before.
export interface ArticleSection {
  title: string;
  markdown: string;
}
export interface RecipeRow {
  machine: string; // "Refiner", "Crafting", "Nutrient Processor"
  inputs: string; // Markdown: "2 × [[Copper]]"
  makes: string; // "1", "4"
  time: string; // "0.36 s", or '' when the wiki gives none
  note: string; // "needs the blueprint", a refiner recipe's name
}

/** The text before the first "## " heading (the title line dropped), and each section after it. */
export function splitSections(markdown: string): { intro: string; sections: ArticleSection[] } {
  const body = markdown.replace(/^\s*#\s+[^\n]*\n*/, '');
  const parts = body.split(/^## /m);
  const intro = (parts.shift() ?? '').trim();
  return {
    intro,
    sections: parts.map(part => {
      const end = part.indexOf('\n');
      const title = (end === -1 ? part : part.slice(0, end)).trim();
      return { title, markdown: end === -1 ? '' : part.slice(end + 1).trim() };
    })
  };
}

const FACT = /^\s*[-*]\s+\*\*([^*]+?):?\*\*:?\s*(.+)$/;
/**
 * Quick Facts ("- **Category:** Special") as pairs, when every list line of the section is one, with what follows
 * the list ("**Chromatic Metal** is a resource.") as `rest`; null when the section isn't a facts list.
 */
export function quickFacts(markdown: string): { facts: [string, string][]; rest: string } | null {
  const lines = markdown.split('\n');
  const listed = lines.filter(line => /^\s*[-*]\s/.test(line));
  const facts = listed.map(line => FACT.exec(line));
  if (!facts.length || !facts.every(Boolean)) return null;
  return {
    facts: facts.map(match => [match?.[1]?.trim() ?? '', match?.[2]?.trim() ?? '']),
    rest: lines
      .filter(line => !/^\s*[-*]\s/.test(line))
      .join('\n')
      .trim()
  };
}

const RECIPE = /^\s*[-*]\s+\*\*(Refiner|Crafting|Nutrient Processor)\*\*\s*·\s*(.*?):\s*(.+?)\s*→\s*([\d.,]+)\s*×.*$/;
/** A section's recipe lines as rows, and the section without them (headings left with nothing under them dropped). */
export function recipeRows(markdown: string): { rows: RecipeRow[]; rest: string } {
  const rows: RecipeRow[] = [];
  const kept: string[] = [];
  for (const line of markdown.split('\n')) {
    const match = RECIPE.exec(line);
    if (!match) {
      kept.push(line);
      continue;
    }
    const [, machine = '', detail = '', inputs = '', makes = ''] = match;
    const parts = detail.split('·').map(part => part.trim().replace(/^\*|\*$/g, ''));
    const time = parts.find(part => /\bs per unit$/.test(part))?.replace(/ per unit$/, '') ?? '';
    rows.push({
      machine,
      inputs,
      makes,
      time,
      note: parts.filter(part => part && !part.endsWith('per unit')).join(' · ')
    });
  }
  // "### Single Input" with its rows gone (nothing before the next heading or the end): drop the heading too.
  const emptied = (i: number) => {
    const next = kept.slice(i + 1).find(line => line.trim());
    return next === undefined || next.startsWith('#');
  };
  const rest = kept
    .filter((line, i) => !(line.startsWith('###') && emptied(i)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { rows, rest };
}

/** How much a section holds, for the On this page sheet: "6 facts", "5 recipes", "4 items", or its words. */
export function sectionSize(section: ArticleSection): string {
  const plural = (n: number, noun: string) => `${String(n)} ${noun}${n === 1 ? '' : 's'}`;
  const facts = quickFacts(section.markdown);
  if (facts) return plural(facts.facts.length, 'fact');
  const { rows, rest } = recipeRows(section.markdown);
  if (rows.length) return plural(rows.length, 'recipe');
  const items = rest.split('\n').filter(line => /^\s*[-*]\s/.test(line)).length;
  if (items) return plural(items, 'item');
  const tableRows = rest.split('\n').filter(line => line.trim().startsWith('|')).length;
  if (tableRows > 2) return plural(tableRows - 2, 'row');
  return plural(rest.split(/\s+/).filter(Boolean).length, 'word');
}
