// Browsing the Codex: faceted filters (a sidebar from lg, chips and selects below), the landing (verification,
// categories, recently edited) or the results with letters and pagination.
import type { ReactNode } from 'react';
import { DEFAULTS, LETTERS, browseHref, type Browse as BrowseView, type BrowseParams } from '@atlas/core/codex';
import { CATEGORIES, isOld, snippet, tokenize, type PreparedEntry } from '@atlas/core/search';
import type { Verification } from '@atlas/core/wiki-files';
import { setParams } from './route.ts';
import { Highlight, SourceBadge, StatusBadge, categoryIcon, categoryLabel, formatDate } from './bits.tsx';

export interface Listed {
  entry: PreparedEntry;
  field: string;
}

const SOURCE_OPTIONS = [
  ['all', 'All sources', 'ph-stack'],
  ['wiki', 'Wiki pages', 'ph-globe'],
  ['custom', 'Your articles', 'ph-pencil-simple']
] as const;
const SORTS = [
  ['relevance', 'Best match', 'ph-sparkle'],
  ['az', 'A–Z', 'ph-sort-ascending']
] as const;

const go = (changes: Partial<BrowseParams>) => {
  setParams({ ...changes, page: 1 });
};

function Facet(props: {
  label: string;
  icon: string;
  count?: number;
  pressed: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="facet"
      aria-pressed={props.pressed}
      disabled={props.count === 0}
      onClick={props.onClick}
      title={props.title}
    >
      <i className={`ph-bold ${props.icon} text-base`} aria-hidden="true" />
      <span className="truncate">{props.label}</span>
      {props.count === undefined ? null : <span className="count">{props.count}</span>}
    </button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="nav-group-label">{label}</h2>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function Browse(props: {
  params: BrowseParams;
  view: BrowseView;
  entries: PreparedEntry[];
  verification: Verification | null;
  listed: Listed[];
  landing: boolean;
  selected: number;
  onPeek: (i: number) => void;
  articleHref: (path: string) => string;
}) {
  const { params, view } = props;
  const srcCount = (key: string) => (key === 'all' ? view.srcTotal : (view.srcCounts[key] ?? 0));
  const oldOn = params.old === '1';
  const toggleOld = () => {
    go({ old: oldOn ? '0' : '1' });
  };
  return (
    <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24 space-y-8">
          <Group label="Category">
            <Facet
              label="All categories"
              icon="ph-squares-four"
              count={view.catTotal}
              pressed={params.cat === 'all'}
              onClick={() => {
                go({ cat: 'all' });
              }}
            />
            {Object.entries(CATEGORIES).map(([key, meta]) => (
              <Facet
                key={key}
                label={meta.label}
                icon={meta.icon}
                count={view.catCounts[key] ?? 0}
                pressed={params.cat === key}
                onClick={() => {
                  go({ cat: key });
                }}
              />
            ))}
          </Group>
          <Group label="Source">
            {SOURCE_OPTIONS.map(([key, label, icon]) => (
              <Facet
                key={key}
                label={label}
                icon={icon}
                count={srcCount(key)}
                pressed={params.src === key}
                onClick={() => {
                  go({ src: key });
                }}
              />
            ))}
          </Group>
          <Group label="Sort">
            {SORTS.map(([key, label, icon]) => (
              <Facet
                key={key}
                label={label}
                icon={icon}
                pressed={params.sort === key}
                onClick={() => {
                  go({ sort: key });
                }}
              />
            ))}
          </Group>
          <Group label="Older items">
            <Facet
              label="Include no longer in game"
              icon="ph-clock-counter-clockwise"
              count={view.oldCount}
              pressed={oldOn}
              onClick={toggleOld}
              title="Items the wiki marks obsolete, and pages since removed from the wiki"
            />
          </Group>
        </div>
      </aside>

      <section className="min-w-0 space-y-5">
        <div className="lg:hidden space-y-3">
          <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              className="chip"
              aria-pressed={params.cat === 'all'}
              onClick={() => {
                go({ cat: 'all' });
              }}
            >
              All <span className="text-slate-400 font-mono text-xs">{view.catTotal}</span>
            </button>
            {Object.entries(CATEGORIES).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                className="chip"
                aria-pressed={params.cat === key}
                onClick={() => {
                  go({ cat: key });
                }}
              >
                <i className={`ph-bold ${meta.icon}`} aria-hidden="true" />
                {meta.label} <span className="text-slate-400 font-mono text-xs">{view.catCounts[key] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Source"
              value={params.src}
              onChange={value => {
                go({ src: value });
              }}
              options={SOURCE_OPTIONS.map(([key, label]) => [key, `${label} (${String(srcCount(key))})`])}
            />
            <Select
              label="Sort"
              value={params.sort}
              onChange={value => {
                go({ sort: value === 'az' ? 'az' : 'relevance' });
              }}
              options={SORTS.map(([key, label]) => [key, label])}
            />
          </div>
          <button type="button" className="chip" aria-pressed={oldOn} onClick={toggleOld}>
            <i className="ph-bold ph-clock-counter-clockwise" aria-hidden="true" />
            Include no longer in game <span className="text-slate-400 font-mono text-xs">{view.oldCount}</span>
          </button>
        </div>

        {!props.entries.length ? <Empty /> : props.landing ? <Landing {...props} /> : <Results {...props} />}
      </section>
    </div>
  );
}

function Select(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (readonly [string, string])[];
}) {
  return (
    <label className="relative">
      <span className="sr-only">{props.label}</span>
      <select
        value={props.value}
        onChange={event => {
          props.onChange(event.target.value);
        }}
        className="w-full h-10 appearance-none bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-8 text-sm text-white"
      >
        {props.options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <i
        className="ph-bold ph-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        aria-hidden="true"
      />
    </label>
  );
}

function Empty() {
  return (
    <div id="browseBody">
      <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center space-y-3">
        <i className="ph-duotone ph-books text-4xl text-emerald-300" aria-hidden="true" />
        <h1 className="font-display font-bold text-lg text-white">The Codex is empty</h1>
        <p className="text-sm text-slate-300 max-w-md mx-auto">
          Run <code className="text-emerald-300">pnpm index:wiki</code> to index the committed archive (or{' '}
          <code className="text-emerald-300">pnpm sync:wiki --from-dump &lt;file&gt;</code> to refresh it from a wiki
          dump), then reload this page.
        </p>
      </div>
    </div>
  );
}

// What the last sync or verify established about the archive. Since ADR-0009 it's checked against a database dump of
// the wiki, so the dump's date is how fresh the copy is.
function VerificationPanel({ v }: { v: Verification | null }) {
  const checked = v ? formatDate(v.checkedAt) : '';
  const copy = v?.dumpDate
    ? new Date(v.dumpDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  let tone = 'border-slate-700';
  let icon = 'ph-question text-slate-400';
  let headline = 'Not verified on this copy';
  let detail: ReactNode = (
    <>
      Run <code className="text-emerald-300">pnpm verify:wiki --from-dump &lt;file&gt;</code> to compare the archive
      with a wiki dump.
    </>
  );
  if (v?.status === 'match') {
    tone = 'border-emerald-500/40';
    icon = 'ph-seal-check text-emerald-300';
    headline = copy
      ? `Wiki copy from ${copy}: ${(v.matched ?? 0).toLocaleString()} of ${(v.pages ?? 0).toLocaleString()} pages match it`
      : `Matches the wiki: ${(v.matched ?? 0).toLocaleString()} of ${(v.pages ?? 0).toLocaleString()} pages at their latest revision`;
    detail = `Checked ${checked}, ${new Date(v.checkedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}${copy ? ` against the wiki's database dump` : ''}. Wiki revisions never change once saved, so a matching revision id means an identical page. Edits made on the wiki since arrive with the next dump.`;
  } else if (v?.status === 'differs') {
    tone = 'border-amber-500/40';
    icon = 'ph-warning text-amber-300';
    headline = `${((v.pages ?? 0) - (v.matched ?? 0)).toLocaleString()} pages behind the wiki${copy ? ` copy from ${copy}` : ''}`;
    detail = (
      <>
        Checked {checked}. Run <code className="text-emerald-300">pnpm sync:wiki --from-dump &lt;file&gt;</code> to
        catch up.
      </>
    );
  } else if (v?.status === 'unreachable') {
    tone = 'border-amber-500/40';
    icon = 'ph-cloud-slash text-amber-300';
    headline = 'The wiki couldn’t be reached at the last check';
    detail = `Tried ${checked}. Showing the archived copy.`;
  } else if (v?.status === 'invalid-response') {
    tone = 'border-amber-500/40';
    icon = 'ph-warning text-amber-300';
    headline = 'The last check stopped on unexpected data from the wiki';
    detail = `Checked ${checked}. Nothing was changed; showing the archived copy.`;
  }
  return (
    <div className={`rounded-2xl bg-slate-900/60 border ${tone} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <i className={`ph-fill ${icon} text-2xl shrink-0`} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{headline}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[70ch]">{detail}</p>
        </div>
      </div>
      {v?.pages ? (
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-400">
          <li>
            <strong className="text-slate-200 tabular-nums">{(v.obsolete ?? 0).toLocaleString()}</strong> obsolete
            items, hidden by default
          </li>
          <li>
            <strong className="text-slate-200 tabular-nums">{(v.excluded ?? 0).toLocaleString()}</strong> player-found
            tools left out
          </li>
          <li>
            <strong className="text-slate-200 tabular-nums">{(v.removed?.length ?? 0).toLocaleString()}</strong> pages
            since removed from the wiki
          </li>
        </ul>
      ) : null}
    </div>
  );
}

function Landing(props: Parameters<typeof Browse>[0]) {
  const current = props.entries.filter(entry => entry.source === 'wiki' && !isOld(entry));
  return (
    <>
      <div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">Wiki Codex</h1>
        <p className="text-sm text-slate-300 mt-1">
          {current.length.toLocaleString()} game pages from the No Man’s Sky Wiki: items, technology, places,
          missions, galaxies, patch notes, mechanics, life and lore.
        </p>
      </div>
      <div id="browseBody" className="space-y-10">
        <VerificationPanel v={props.verification} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Object.entries(CATEGORIES).map(([key, meta]) => {
            const pages = current.filter(entry => entry.category === key);
            const examples = [...pages]
              .sort((a, b) => a._title.localeCompare(b._title))
              .slice(0, 3)
              .map(entry => entry.title)
              .join(' · ');
            return (
              <a
                key={key}
                href={browseHref({ ...DEFAULTS, cat: key })}
                className="group block rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 p-4 transition"
              >
                <span className="flex items-center gap-3">
                  <span className="nav-tile text-emerald-300">
                    <i className={`ph-bold ${meta.icon}`} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{meta.label}</span>
                    <span className="block text-xs text-slate-400">{`${pages.length.toLocaleString()} pages`}</span>
                  </span>
                  <i
                    className="ph-bold ph-arrow-right ml-auto text-slate-500 group-hover:text-emerald-300 transition"
                    aria-hidden="true"
                  />
                </span>
                <span className="block text-xs text-slate-400 mt-3">{meta.blurb}</span>
                <span className="block text-xs text-slate-300 mt-2 truncate">{examples}</span>
              </a>
            );
          })}
        </div>
        <div className="space-y-3">
          <h2 className="font-display font-bold text-base text-white">Recently edited on the wiki</h2>
          <ul className="grid grid-cols-1 xl:grid-cols-2 gap-1">
            {props.listed.map((item, i) => (
              <li key={String(item.entry.path)}>
                <button
                  type="button"
                  onClick={() => {
                    props.onPeek(i);
                  }}
                  data-selected={props.selected === i}
                  aria-current={props.selected === i ? 'true' : undefined}
                  className="result w-full text-left"
                >
                  <span className="nav-tile text-cyan-300 mt-0.5">
                    <i className={`ph-bold ${categoryIcon(item.entry.category)}`} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <strong className="text-sm text-white truncate">{item.entry.title}</strong>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatDate(item.entry.revTimestamp as string | undefined)}
                      </span>
                    </span>
                    <span className="block text-xs text-slate-400 mt-0.5 line-clamp-2">{item.entry.summary}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

const FIELD_LABEL: Record<string, string> = { title: '', summary: 'in summary', text: 'in article text' };

function Results(props: Parameters<typeof Browse>[0]) {
  const { params, view } = props;
  const tokens = tokenize(params.q);
  const total = view.results.length;
  const chips: [keyof BrowseParams, string][] = [];
  if (params.q) chips.push(['q', `“${params.q}”`]);
  if (params.cat !== 'all') chips.push(['cat', categoryLabel(params.cat)]);
  if (params.src !== 'all') chips.push(['src', params.src === 'custom' ? 'Your articles' : 'Wiki pages']);
  if (params.letter) chips.push(['letter', `Starts with ${params.letter}`]);
  if (params.old === '1') chips.push(['old', 'Incl. no longer in game']);
  const from = (view.page - 1) * 20 + 1;
  const to = Math.min(total, view.page * 20);
  const turn = (page: number) => {
    setParams({ page });
    window.scrollTo({ top: 0 });
  };
  return (
    <>
      <div id="resultsHeader" className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-sm text-slate-300 font-normal">
          <strong className="text-white font-semibold tabular-nums">{total.toLocaleString()}</strong>{' '}
          {total === 1 ? 'article' : 'articles'}
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                go({ [key]: DEFAULTS[key] });
              }}
              aria-label={`Remove filter: ${label}`}
              className="h-7 pl-2.5 pr-2 rounded-full bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-200 flex items-center gap-1.5"
            >
              {label}
              <i className="ph-bold ph-x text-[10px] text-slate-400" aria-hidden="true" />
            </button>
          ))}
          {chips.length > 1 ? (
            <a href="#/" className="h-7 px-2 inline-flex items-center text-xs text-emerald-300 hover:text-emerald-200">
              Clear all
            </a>
          ) : null}
        </div>
      </div>
      <nav aria-label="Browse by letter" className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          className="letter px-2.5"
          aria-pressed={!params.letter}
          onClick={() => {
            go({ letter: '' });
          }}
        >
          All
        </button>
        {LETTERS.map(letter => (
          <button
            key={letter}
            type="button"
            className="letter"
            aria-pressed={params.letter === letter}
            disabled={!view.letters.has(letter)}
            onClick={() => {
              go({ letter });
            }}
            aria-label={`Titles starting with ${letter === '#' ? 'a number or symbol' : letter}`}
          >
            {letter}
          </button>
        ))}
      </nav>
      <div id="browseBody">
        <p id="quickLookHint" hidden>
          Opens a quick look
        </p>
        {props.listed.length ? (
          <ul className="space-y-1" aria-label="Articles">
            {props.listed.map((item, i) => {
              const entry = item.entry;
              const text = tokens.length && item.field !== 'title' ? snippet(entry, tokens) : (entry.summary ?? '');
              return (
                <li
                  key={String(entry.path)}
                  className="result group"
                  data-selected={props.selected === i}
                  aria-current={props.selected === i ? 'true' : undefined}
                >
                  <button
                    type="button"
                    onClick={() => {
                      props.onPeek(i);
                    }}
                    className="min-w-0 flex-1 flex gap-3 items-start text-left"
                    aria-describedby="quickLookHint"
                  >
                    <span className={`nav-tile ${entry.source === 'wiki' ? 'text-cyan-300' : 'text-amber-300'} mt-0.5`}>
                      <i className={`ph-bold ${categoryIcon(entry.category)}`} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <strong className="text-[0.9375rem] text-white">
                          <Highlight text={entry.title} tokens={tokens} />
                        </strong>
                        <SourceBadge source={entry.source} />
                        <StatusBadge entry={entry} />
                        <span className="text-xs text-slate-400">
                          {categoryLabel(entry.category)}
                          {tokens.length && FIELD_LABEL[item.field] ? ` · ${FIELD_LABEL[item.field] ?? ''}` : ''}
                        </span>
                      </span>
                      <span className="block text-[0.8125rem] leading-relaxed text-slate-300 mt-1 line-clamp-2">
                        <Highlight text={text} tokens={tokens} />
                      </span>
                    </span>
                  </button>
                  <a
                    href={props.articleHref(String(entry.path))}
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    aria-label={`Open ${entry.title}`}
                    title="Open article"
                  >
                    <i className="ph-bold ph-arrow-right" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center space-y-2">
            <p className="text-white font-semibold">No articles match.</p>
            <p className="text-sm text-slate-400">Try fewer words, another spelling, or clear a filter.</p>
          </div>
        )}
      </div>
      {view.pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={view.page === 1}
            onClick={() => {
              turn(view.page - 1);
            }}
            aria-label="Previous page"
            className="h-10 px-4 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
          >
            <i className="ph-bold ph-arrow-left" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <span className="text-xs text-slate-400 tabular-nums">
            {`${String(from)}–${String(to)} of ${total.toLocaleString()} · page ${String(view.page)}/${String(view.pages)}`}
          </span>
          <button
            type="button"
            disabled={view.page === view.pages}
            onClick={() => {
              turn(view.page + 1);
            }}
            aria-label="Next page"
            className="h-10 px-4 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
          >
            <span className="hidden sm:inline">Next</span>
            <i className="ph-bold ph-arrow-right" aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </>
  );
}
