// A book's milestones (design 18): each tick is a real checkbox (keyboard and screen readers included), saved to
// nms_state.json → checklists under its id. A book holding more than one list shows each under its own subhead.
import { bookChecks, milestoneHint, type BookKey } from '@atlas/core/guides';
import { toggleChecklist } from '../actions.ts';
import { useAppState } from '../useAppState.ts';

export function Milestones({ book }: { book: BookKey }) {
  const { checklists, gear } = useAppState();
  const groups = bookChecks(book);
  return (
    <section aria-labelledby={`${book}-milestones`} className="rounded-card bg-panel-glass border border-hairline p-4">
      <h2
        id={`${book}-milestones`}
        className="font-display font-bold text-[15px] text-ink-bright flex items-center gap-2"
      >
        <i className="ph-bold ph-flag-banner text-scanner-cyan-pale" aria-hidden="true" />
        Milestones
      </h2>
      {groups.map(group => (
        <div key={group.key} id={`checklist-${group.key}`} className="mt-3">
          {groups.length > 1 && <h3 className="text-label uppercase text-ink-label pb-1">{group.label}</h3>}
          <ul>
            {group.items.map(item => {
              const done = checklists[item.id] === true;
              return (
                <li key={item.id} className="border-t border-hairline">
                  <label data-check={item.id} className="flex items-start gap-3 py-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => {
                        toggleChecklist(item.id);
                      }}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`w-[26px] h-[26px] shrink-0 rounded-[8px] grid place-items-center peer-focus-visible:outline-2 peer-focus-visible:outline-scanner-cyan-glow ${
                        done
                          ? 'bg-ready-emerald text-ready-emerald-ink shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                          : 'border border-control-edge-hover group-hover:border-ready-emerald-edge'
                      }`}
                    >
                      {done && <i className="ph-bold ph-check text-[15px]" />}
                    </span>
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span
                        className={`text-[14px] font-semibold ${done ? 'text-ready-emerald-bright' : 'text-ink-bright'}`}
                      >
                        {item.title}
                      </span>
                      <span className="text-caption text-ink-muted">{milestoneHint(item.id, gear) ?? item.desc}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
