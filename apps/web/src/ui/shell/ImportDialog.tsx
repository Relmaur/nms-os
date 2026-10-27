// The second step of Import: what the file holds, what happens to this log (kept as a backup for Undo) and, with sync
// on, to the synced log, before anything is replaced.
import { useCallback, type SubmitEvent } from 'react';
import { cancelImport, confirmImport, usePendingImport } from '../../app/backup.ts';
import { Modal } from '../parts/Modal.tsx';

const count = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? '' : 's'}`;

export function ImportDialog() {
  const pending = usePendingImport();
  const dismiss = useCallback(() => {
    cancelImport();
  }, []);
  if (!pending) return null;
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    confirmImport();
  };
  return (
    <Modal
      id="importDialog"
      onSubmit={submit}
      title="Import this log?"
      titleId="importDialogTitle"
      dismiss={dismiss}
      onClose={dismiss}
      footer={
        <>
          <button
            type="button"
            onClick={dismiss}
            className="h-10 px-4 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            autoFocus
            className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-semibold"
          >
            Replace this device’s log
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-200">
        <span className="font-mono text-cyan-200 break-all">{pending.name}</span> holds{' '}
        {count(pending.systems, 'system')}, {count(pending.gear, 'ship or Multi-Tool')} and{' '}
        {count(pending.notes, 'note')}. It replaces the log on this device; your current log is kept as a backup, and
        More → Your data → Undo import puts it back.
      </p>
      {pending.syncOn && (
        <p className="text-sm text-amber-200">
          Sync is on: on the next sync, the file’s log is combined with your synced log, so what you add reaches your
          other devices and nothing is removed from them.
        </p>
      )}
    </Modal>
  );
}
