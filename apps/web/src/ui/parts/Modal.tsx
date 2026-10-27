// An editor in a dialog: a bottom sheet on phones (grab bar, swipe down), a centred modal from sm with its ✕. Esc,
// the bar, a swipe and a tap outside all ask `dismiss`, which refuses while there are unsaved changes; the footer's
// Cancel is the way to discard them.
import { useEffect, useRef, type ReactNode, type SubmitEvent } from 'react';
import { SheetGrab, useSheetDrag } from './Sheet.tsx';

export function Modal(props: {
  id: string; // the dialog is the editor's form
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  title: string;
  titleId: string;
  dismiss: () => void;
  onClose: () => void; // the ✕: discards, like Cancel
  footer: ReactNode;
  children: ReactNode;
}) {
  const { dismiss } = props;
  const sheet = useRef<HTMLDivElement>(null);
  useSheetDrag(sheet, dismiss);

  // Once per open: `dismiss` changes as the draft does, and the setup below shouldn't rerun on every keystroke.
  const latest = useRef(dismiss);
  useEffect(() => {
    latest.current = dismiss;
  }, [dismiss]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') latest.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('overflow-hidden');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('overflow-hidden'); // focus goes back to the opener in closeEditor()
    };
  }, []);

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
        aria-labelledby={props.titleId}
        className="w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-slate-950 border border-slate-700"
      >
        <form id={props.id} onSubmit={props.onSubmit} className="flex flex-col flex-1 min-h-0">
          <div data-sheet-grab className="px-5 pt-3 sm:pt-5 pb-3 border-b border-slate-800">
            <SheetGrab onClose={dismiss} label={`Close ${props.title.toLowerCase()}`} />
            <div className="flex items-center justify-between">
              <h2 id={props.titleId} className="font-display font-bold text-lg text-white">
                {props.title}
              </h2>
              <button
                type="button"
                onClick={props.onClose}
                aria-label="Close"
                className="hidden md:flex w-9 h-9 -mr-1.5 rounded-xl items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <i className="ph-bold ph-x text-lg" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5">{props.children}</div>
          <div className="border-t border-slate-800 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3 flex items-center justify-end gap-2">
            {props.footer}
          </div>
        </form>
      </div>
    </div>
  );
}
