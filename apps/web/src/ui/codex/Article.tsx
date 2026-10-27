// An article: header, then (below lg) the index bar that opens the article index sheet, and a slim strip that
// follows the reader with the current section; from lg the same index is the sticky right rail.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { DEFAULTS, browseHref, relations, type CodexIndex } from '@atlas/core/codex';
import type { PreparedEntry } from '@atlas/core/search';
import { showToast } from '../../app/ui.ts';
import { WikiSearch } from '../../app/wiki-data.js';
import { SheetGrab, useSheetDrag, useSheetOpen } from '../parts/Sheet.tsx';
import { SourceBadge, StatusBadge, categoryIcon, categoryLabel, formatDate } from './bits.tsx';
import { loadCodex } from './codex-data.ts';
import { renderMarkdown, type Heading } from './markdown.ts';
import { navigate } from './route.ts';

const LIST_LIMIT = 12;
type Section = 'contents' | 'usedIn' | 'linksTo' | 'mentionedIn' | 'nearby';

// The wiki fields the article header shows (the index keeps unknown fields as `unknown`).
const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const revision = (entry: PreparedEntry) => (typeof entry.revId === 'number' ? entry.revId : undefined);
const permalink = (entry: PreparedEntry) => `${text(entry.url) ?? ''}?oldid=${String(revision(entry))}`;

export function Article({ index, path, q }: { index: CodexIndex; path: string; q: string }) {
  const entry = index.byPath.get(path);
  const href = (target: string) => `#/a/${encodeURIComponent(target)}${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  const rendered = useMemo(
    () => (entry ? renderMarkdown(entry.body ?? '', index, q) : { html: '', headings: [] }),
    [entry, index, q]
  );
  const related = useMemo(() => (entry ? relations(index, entry) : null), [entry, index]);
  const active = useActiveHeading(rendered.headings);
  const [sheet, setSheet] = useState<Section | null>(null);
  const closeSheet = useCallback(() => {
    setSheet(null);
  }, []);
  const bar = useRef<HTMLDivElement>(null);
  const barGone = useScrolledPast(bar);

  // Each article mounts afresh (keyed by path), so the sheet and the active heading start clean.
  useEffect(() => {
    document.title = `${entry?.title ?? 'Article not found'} · Wiki Codex`;
    window.scrollTo({ top: 0 });
  }, [entry]);

  const back = q ? (
    <a
      href={browseHref({ ...DEFAULTS, q })}
      className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 mr-2"
    >
      <i className="ph-bold ph-arrow-left" aria-hidden="true" />
      {`Results for “${q}”`}
    </a>
  ) : null;

  if (!entry || !related)
    return (
      <article className="min-w-0">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mb-6">
          {back}
        </nav>
        <header id="articleHeader" className="mb-8 space-y-4">
          <h1 className="font-display font-bold text-2xl text-white">Article not found</h1>
        </header>
        <div id="articleBody" className="md-body">
          <p>
            No article at <code>{path}</code>. It may have been renamed by a re-sync. <a href="#/">Back to the Codex</a>
            .
          </p>
        </div>
      </article>
    );

  const lists: [Exclude<Section, 'contents'>, string, PreparedEntry[]][] = [
    ['usedIn', 'Used in', related.usedIn],
    ['linksTo', 'Links to', related.linksTo],
    ['mentionedIn', 'Mentioned in', related.mentionedIn],
    ['nearby', `More in ${categoryLabel(entry.category)}`, related.nearby]
  ];
  const toc = rendered.headings.length > 1 ? rendered.headings : [];
  const hasIndex = toc.length > 0 || lists.some(([, , list]) => list.length > 0);
  const goTo = (id: string) => {
    setSheet(null);
    document.getElementById(id)?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  };
  const articleIndex = <ArticleIndex toc={toc} active={active} lists={lists} href={href} onHeading={goTo} />;
  const removeDraft = () => {
    WikiSearch.writeDrafts(WikiSearch.readDrafts().filter(draft => draft.path !== entry.path));
    navigate('#/'); // first, so the reload doesn't flash "Article not found"
    void loadCodex().then(() => {
      showToast('Draft removed.');
    });
  };
  const copyLink = () => {
    const url = location.href;
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(url)) // missing outside a secure context: the toast shows the link
      .then(() => {
        showToast('Link copied.');
      })
      .catch(() => {
        showToast(url);
      });
  };

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
      <article className="min-w-0">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mb-6">
          {back}
          <a href="#/" className="hover:text-white">
            Codex
          </a>
          <i className="ph-bold ph-caret-right text-[10px]" aria-hidden="true" />
          <a href={browseHref({ ...DEFAULTS, cat: entry.category })} className="hover:text-white">
            {categoryLabel(entry.category)}
          </a>
          <i className="ph-bold ph-caret-right text-[10px]" aria-hidden="true" />
          <span className="text-slate-300 truncate max-w-[50vw]">{entry.title}</span>
        </nav>
        <header id="articleHeader" className="mb-6 lg:mb-8 space-y-4 max-w-[72ch]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <SourceBadge source={entry.source} />
            <StatusBadge entry={entry} />
            <span>{categoryLabel(entry.category)}</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-white leading-tight text-balance">
            {entry.title}
          </h1>
          {entry.summary ? <p className="text-base text-slate-300 leading-relaxed">{entry.summary}</p> : null}
          {entry.removed ? (
            <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              This page has been removed from the wiki. You’re reading the last archived copy.
            </p>
          ) : entry.obsolete ? (
            <p className="rounded-xl border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">
              No longer in the game: the wiki keeps this page for an older version.
            </p>
          ) : null}
          {revision(entry) ? (
            <p className="text-xs text-slate-400 leading-relaxed">
              Wiki revision{' '}
              <a
                href={permalink(entry)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
              >
                {String(revision(entry))}
              </a>
              {`, edited ${formatDate(text(entry.revTimestamp))}`}
              {text(entry.version) ? (
                <>
                  {' · the wiki marks it up to date as of the '}
                  <strong className="text-slate-200 font-medium">{text(entry.version)}</strong> update
                </>
              ) : null}
              .
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={copyLink} className={ACTION}>
              <i className="ph-bold ph-link" aria-hidden="true" />
              Copy link
            </button>
            {text(entry.url) ? (
              <a href={text(entry.url)} target="_blank" rel="noopener noreferrer" className={ACTION}>
                <i className="ph-bold ph-arrow-square-out" aria-hidden="true" />
                Live wiki page
              </a>
            ) : null}
            {entry.source === 'draft' ? (
              <button
                type="button"
                onClick={removeDraft}
                className="h-9 px-3 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs flex items-center gap-2"
              >
                <i className="ph-bold ph-trash" aria-hidden="true" />
                Remove draft
              </button>
            ) : null}
          </div>
        </header>

        <IndexBar ref={bar} toc={toc} lists={lists} onOpen={setSheet} />
        <ReadingStrip
          shown={barGone && hasIndex}
          section={toc.find(heading => heading.id === active)?.text}
          onOpen={() => {
            setSheet('contents');
          }}
        />

        <div id="articleBody" className="md-body" dangerouslySetInnerHTML={{ __html: rendered.html }} />
        {text(entry.url) ? (
          <p className="text-xs text-slate-400 pt-6 border-t border-slate-800 mt-10 max-w-[72ch]">
            Source:{' '}
            <a
              href={permalink(entry)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {`No Man's Sky Wiki, revision ${String(revision(entry))}`}
            </a>{' '}
            · CC BY-SA 3.0 · rendered from the page source
          </p>
        ) : null}
      </article>

      <aside aria-label="Article index" className="hidden lg:block">
        <div
          id="articleRail"
          className="sticky top-24 space-y-8 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain pb-4"
        >
          {articleIndex}
        </div>
      </aside>

      <IndexSheet open={sheet !== null} section={sheet} title={entry.title} onClose={closeSheet}>
        {articleIndex}
      </IndexSheet>
    </div>
  );
}

const ACTION =
  'h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-200 flex items-center gap-2';

// The section being read: the last heading at or above the bottom of the header and reading strip (plus a little),
// checked on scroll once per frame. Scrolling back up into a long section names it again.
const READING_LINE = 120;
function useActiveHeading(headings: Heading[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (headings.length < 2) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      let current: string | undefined;
      for (const heading of headings) {
        const node = document.getElementById(heading.id);
        if (node && node.getBoundingClientRect().top <= READING_LINE) current = heading.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [headings]);
  return active;
}

// True once the element has scrolled up out of view (not before it's reached).
function useScrolledPast(ref: RefObject<HTMLElement | null>): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // The sticky header (64px) covers the element before it leaves the viewport, so that's where it counts as gone.
    const observer = new IntersectionObserver(
      ([item]) => {
        if (item) setPast(!item.isIntersecting && item.boundingClientRect.top < 64);
      },
      { rootMargin: '-64px 0px 0px 0px' }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return past;
}

const SECTION_ICON: Record<Section, string> = {
  contents: 'ph-list-bullets',
  usedIn: 'ph-arrow-bend-up-right',
  linksTo: 'ph-link-simple',
  mentionedIn: 'ph-quotes',
  nearby: 'ph-squares-four'
};

function IndexBar({
  ref,
  ...props
}: {
  ref: RefObject<HTMLDivElement | null>;
  toc: Heading[];
  lists: [Exclude<Section, 'contents'>, string, PreparedEntry[]][];
  onOpen: (section: Section) => void;
}) {
  const items: [Section, string, number][] = [
    ...(props.toc.length ? [['contents', 'Contents', props.toc.length] as [Section, string, number]] : []),
    ...props.lists
      .filter(([, , list]) => list.length)
      .map(([key, label, list]): [Section, string, number] => [key, key === 'nearby' ? 'Nearby' : label, list.length])
  ];
  if (!items.length) return <div ref={ref} />;
  return (
    <div ref={ref} id="articleIndexBar" className="lg:hidden -mx-4 px-4 mb-8 flex gap-2 overflow-x-auto no-scrollbar">
      {items.map(([key, label, count]) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            props.onOpen(key);
          }}
          className="chip"
          aria-haspopup="dialog"
        >
          <i className={`ph-bold ${SECTION_ICON[key]} text-cyan-300`} aria-hidden="true" />
          {label}
          <span className="font-mono tabular-nums text-xs text-cyan-200/80">{count}</span>
        </button>
      ))}
    </div>
  );
}

function ReadingStrip(props: { shown: boolean; section: string | undefined; onOpen: () => void }) {
  return (
    <div
      aria-hidden={!props.shown}
      inert={!props.shown}
      className={`lg:hidden fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-30 transition-[opacity,transform] duration-200 ${props.shown ? '' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
    >
      <button
        type="button"
        onClick={props.onOpen}
        aria-haspopup="dialog"
        className="w-full h-10 px-4 flex items-center gap-2 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-left"
      >
        <i className="ph-bold ph-list-bullets text-cyan-300" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{props.section ?? 'Article index'}</span>
        <span className="text-xs text-cyan-200">Index</span>
        <i className="ph-bold ph-caret-down text-xs text-slate-400" aria-hidden="true" />
      </button>
    </div>
  );
}

function ArticleIndex(props: {
  toc: Heading[];
  active: string | undefined;
  lists: [Exclude<Section, 'contents'>, string, PreparedEntry[]][];
  href: (path: string) => string;
  onHeading: (id: string) => void;
}) {
  return (
    <>
      {props.toc.length ? (
        <section data-section="contents">
          <h2 tabIndex={-1} className="nav-group-label !px-0 outline-none">
            On this page
          </h2>
          <nav aria-label="On this page" className="space-y-0.5">
            {props.toc.map(heading => (
              <button
                key={heading.id}
                type="button"
                className={`toc-link ${props.active === heading.id ? 'is-active' : ''}`}
                data-depth={heading.depth}
                onClick={() => {
                  props.onHeading(heading.id);
                }}
              >
                {heading.text}
              </button>
            ))}
          </nav>
        </section>
      ) : null}
      {props.lists.map(([key, title, list]) =>
        list.length ? <RelationList key={key} section={key} title={title} items={list} href={props.href} /> : null
      )}
    </>
  );
}

function RelationList(props: {
  section: Section;
  title: string;
  items: PreparedEntry[];
  href: (path: string) => string;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? props.items : props.items.slice(0, LIST_LIMIT);
  return (
    <section data-section={props.section}>
      <h2 tabIndex={-1} className="nav-group-label !px-0 outline-none">
        {props.title}
      </h2>
      <ul className="space-y-1">
        {shown.map(item => (
          <li key={String(item.path)}>
            <a
              href={props.href(String(item.path))}
              className="flex items-center gap-2 py-1 text-sm text-slate-300 hover:text-white"
            >
              <i className={`ph-bold ${categoryIcon(item.category)} text-slate-500 shrink-0`} aria-hidden="true" />
              <span className="truncate">{item.title}</span>
            </a>
          </li>
        ))}
      </ul>
      {props.items.length > LIST_LIMIT ? (
        <button
          type="button"
          onClick={() => {
            setAll(!all);
          }}
          aria-expanded={all}
          className="mt-1 h-8 text-xs text-emerald-300 hover:text-emerald-200"
        >
          {all ? 'Show fewer' : `Show all ${String(props.items.length)}`}
        </button>
      ) : null}
    </section>
  );
}

// The article index as a bottom sheet below lg: the bar closes it (no ✕ on phones), and it opens at the section
// that was tapped.
function IndexSheet(props: {
  open: boolean;
  section: Section | null;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const { open, section, onClose } = props;
  useSheetDrag(sheet, onClose);
  useSheetOpen(open, onClose, { layout: '(max-width: 1023px)' });
  // It opens at the list that was tapped, with focus on that list's heading.
  useEffect(() => {
    if (!open || !body.current) return;
    const target = body.current.querySelector<HTMLElement>(`[data-section="${section ?? 'contents'}"]`);
    body.current.scrollTop = target ? target.offsetTop - 8 : 0;
    target?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }, [open, section]);
  return (
    <div className="lg:hidden">
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] transition-opacity duration-200 ${open ? '' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        ref={sheet}
        id="articleIndexSheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Index of ${props.title}`}
        aria-hidden={!open}
        inert={!open}
        className={`fixed z-50 inset-x-0 bottom-0 max-h-[80dvh] flex flex-col rounded-t-3xl border-t border-slate-700 bg-slate-950 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? '' : 'translate-y-full'}`}
      >
        <div data-sheet-grab className="px-5 pt-3 pb-3 border-b border-slate-800">
          <SheetGrab onClose={onClose} label="Close the index" />
          <div className="flex items-center justify-between gap-3">
            <p className="font-display font-bold text-base text-white truncate">{props.title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the index"
              className="hidden md:flex w-9 h-9 -mr-1.5 rounded-xl items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <i className="ph-bold ph-x text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          ref={body}
          className="relative flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-8 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        >
          {props.children}
        </div>
      </div>
    </div>
  );
}
