// A checklist inside a book: each step is a real checkbox (keyboard and screen readers included), saved to
// nms_state.json → checklists under the step's id.
import { CHECKLISTS, type ChecklistKey } from '@atlas/core/guides';
import { toggleChecklist } from '../actions.ts';
import { useAppState } from '../useAppState.ts';

export function Checklist({ group, className }: { group: ChecklistKey; className: string }) {
  const { checklists } = useAppState();
  return (
    <div id={`checklist-${group}`} className={className}>
      {CHECKLISTS[group].map(item => {
        const done = checklists[item.id] === true;
        return (
          <label
            key={item.id}
            data-check={item.id}
            className={`cursor-pointer p-3 rounded-xl border text-xs flex items-start gap-3 transition focus-within:ring-2 focus-within:ring-cyan-400 ${done ? 'bg-cyan-950/30 border-cyan-500/40 text-slate-400 line-through' : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-200'}`}
          >
            <input
              type="checkbox"
              checked={done}
              onChange={() => {
                toggleChecklist(item.id);
              }}
              className="mt-0.5 shrink-0 accent-cyan-400 focus:outline-hidden"
            />
            <span>
              <strong className={`${done ? 'text-slate-400' : 'text-white'} block`}>{item.title}</strong>{' '}
              <span className="text-slate-400">{item.desc}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
