// Write an article of your own: it downloads as a Markdown file for wiki/custom/ and stays in this browser as a
// draft until it's indexed. A modal from sm, a bottom sheet below. The bar, a swipe and Esc close it only while
// it's empty; Cancel (or the ✕ from md) discards what was written.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, slugify } from '@atlas/core/search';
import type { CodexIndex } from '@atlas/core/codex';
import { showToast } from '../../app/ui.ts';
import { WikiSearch } from '../../app/wiki-data.js';
import { SheetGrab, useSheetDrag } from '../parts/Sheet.tsx';
import { loadCodex } from './codex-data.ts';
import { renderMarkdown } from './markdown.ts';
import { navigate } from './route.ts';

const FIELD = 'w-full h-10 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base md:text-sm text-white';

export function NewArticle(props: { category: string; index: CodexIndex; onClose: () => void }) {
  const { onClose } = props;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(Object.hasOwn(CATEGORIES, props.category) ? props.category : 'resources');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const sheet = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const dirty = Boolean(title.trim() || summary.trim() || body.trim());

  // The bar and a swipe leave only when nothing would be lost; Cancel is the way to discard.
  const dismiss = useMemo(
    () => () => {
      if (dirty) showToast('Unsaved article: save it, or Cancel to discard.');
      else onClose();
    },
    [dirty, onClose]
  );
  useSheetDrag(sheet, dismiss);

  // Mounted while open: it starts empty in the category being browsed. Esc asks like the bar does.
  useEffect(() => {
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [dismiss]);

  const preview = useMemo(() => renderMarkdown(body, props.index).html, [body, props.index]);

  const save = () => {
    const name = title.trim();
    const text = body.trim();
    const slug = slugify(name);
    if (!slug || !text) {
      showToast('Add a title (letters or numbers) and some Markdown first.');
      return;
    }
    const line =
      summary.trim() ||
      text
        .replace(/[#*_`>[\]|-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);
    const path = `wiki/custom/${category}/${slug}.md`;
    const markdown = `# ${name}\n\n${text}\n`;
    // Frontmatter format matches what the wiki sync (packages/wiki) writes and parses.
    const file = [
      '---',
      `title: ${JSON.stringify(name)}`,
      `category: ${JSON.stringify(category)}`,
      `summary: ${JSON.stringify(line)}`,
      'source: "custom"',
      `updated: ${JSON.stringify(new Date().toISOString().slice(0, 10))}`,
      '---',
      '',
      markdown
    ].join('\n');
    const url = URL.createObjectURL(new Blob([file], { type: 'text/markdown' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slug}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    WikiSearch.writeDrafts([
      { title: name, slug, category, path, summary: line, body: markdown },
      ...WikiSearch.readDrafts().filter(draft => draft.path !== path)
    ]);
    onClose();
    void loadCodex().then(() => {
      navigate(`#/a/${encodeURIComponent(path)}`);
      showToast(`Downloaded ${slug}.md. Move it into wiki/custom/${category}/ and run pnpm index:wiki.`);
    });
  };

  return (
    <div
      onClick={event => {
        if (event.target === event.currentTarget) dismiss();
      }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm sm:p-4"
    >
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="createTitle"
        className="w-full max-w-4xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-slate-950 border border-slate-700 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5 pt-3 sm:pt-5 space-y-3"
      >
        <div data-sheet-grab>
          <SheetGrab onClose={dismiss} label="Close new article" />
          <div className="flex items-center justify-between">
            <h2 id="createTitle" className="font-display font-bold text-base text-white">
              New article
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="hidden md:flex w-9 h-9 rounded-xl items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <i className="ph-bold ph-x text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            ref={first}
            type="text"
            id="newTitle"
            value={title}
            onChange={event => {
              setTitle(event.target.value);
            }}
            placeholder="Article title"
            aria-label="Article title"
            className={`md:col-span-2 ${FIELD}`}
          />
          <select
            id="newCategory"
            value={category}
            onChange={event => {
              setCategory(event.target.value);
            }}
            aria-label="Category"
            className={FIELD}
          >
            {Object.entries(CATEGORIES).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          id="newSummary"
          value={summary}
          onChange={event => {
            setSummary(event.target.value);
          }}
          placeholder="One-line summary (shown in search results)"
          aria-label="One-line summary"
          className={FIELD}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <textarea
            id="newBody"
            rows={14}
            value={body}
            onChange={event => {
              setBody(event.target.value);
            }}
            placeholder={'## Overview\nWrite Markdown here. Link other articles with [[Article Title]].'}
            aria-label="Article Markdown"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base md:text-sm font-mono text-white"
          />
          <div
            id="newPreview"
            aria-label="Preview"
            className="md-body text-sm bg-slate-900/50 border border-slate-800 rounded-xl p-4 overflow-y-auto max-h-[22rem]"
          >
            <h1>{title.trim() || 'Untitled article'}</h1>
            <div dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Downloads as <code className="text-emerald-300">&lt;Title&gt;.md</code>. Move it into{' '}
          <code className="text-emerald-300">wiki/custom/&lt;category&gt;/</code> and run{' '}
          <code className="text-emerald-300">pnpm index:wiki</code>; until then it stays in this browser as a draft.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-2"
          >
            <i className="ph-bold ph-download-simple" aria-hidden="true" /> Save draft & download
          </button>
        </div>
      </div>
    </div>
  );
}
