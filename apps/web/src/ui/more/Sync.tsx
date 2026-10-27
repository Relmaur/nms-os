// More → Sync: turn sync on, pair another device (QR code or the code typed in), see how it's going, and turn it off
// or delete the cloud copy (ADR-0005). Opt-in; nothing leaves the device before Turn on or Pair.
import { useState, type ReactNode, type SyntheticEvent } from 'react';
import { encode } from 'uqr';
import { formatAgo } from '@atlas/core/format';
import { showToast } from '../../app/ui.ts';
import {
  answerPairing,
  deleteCloudCopy,
  pairWith,
  SYNC_URL,
  syncCode,
  syncNow,
  turnOffSync,
  turnOnSync,
  useSyncStatus,
  type SyncStatus
} from '../../app/sync.ts';
import { useClock } from '../session/useClock.ts';

const PROBLEM: Record<NonNullable<SyncStatus['problem']>, string> = {
  offline: 'Offline. Changes stay on this device and sync when you’re back online.',
  server: 'Couldn’t reach the sync server. Your log is safe on this device; it tries again soon.',
  gone: 'The cloud copy was deleted from another device. Start again to upload this log with a new code.',
  damaged: 'The cloud copy couldn’t be opened with this code. Nothing here was changed.',
  storage: 'This device’s storage is full, so sync is paused. Free some space, or export a backup.'
};

export function Sync() {
  const status = useSyncStatus();
  if (!SYNC_URL) return null; // a build without a relay (e.g. a fork): Export/Import still move the log
  return (
    <div className="space-y-2">
      <h2 className="list-heading">Sync</h2>
      <div id="syncPanel" className="list-group p-4 space-y-4">
        {status.pending && <PairPrompt />}
        {status.enabled ? <On status={status} /> : <Off />}
        <p className="text-xs text-slate-400 leading-relaxed">
          Your log is encrypted on this device before it’s sent; the server keeps a locked copy it can’t open, and
          deletes it after a year without syncing. Lose every device and the code, and that copy can’t be recovered.
        </p>
      </div>
    </div>
  );
}

function PairPrompt() {
  return (
    <div role="alert" className="rounded-xl border border-cyan-500/40 bg-cyan-500/[0.07] p-3.5 space-y-3">
      <p className="text-sm text-slate-200">
        Pair this device with the code you scanned? Its log and the synced log are merged; nothing is lost on either
        side.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void answerPairing(true)}
          className="h-10 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold"
        >
          Pair
        </button>
        <button
          type="button"
          onClick={() => void answerPairing(false)}
          className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm text-slate-200"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

function Off() {
  const [entering, setEntering] = useState(false);
  return (
    <>
      <Line icon="ph-arrows-clockwise text-slate-400" title="Sync between your devices">
        Your log on your PC and your phone, kept in step. No account needed.
      </Line>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void turnOnSync()}
          className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold"
        >
          Turn on sync
        </button>
        <button
          type="button"
          aria-expanded={entering}
          aria-controls="syncCodeForm"
          onClick={() => {
            setEntering(!entering);
          }}
          className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm text-slate-200"
        >
          I have a code
        </button>
      </div>
      {entering && <CodeForm />}
    </>
  );
}

function CodeForm() {
  const [error, setError] = useState(false);
  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get('code');
    void pairWith(typeof text === 'string' ? text : '').then(ok => {
      setError(!ok);
    });
  };
  return (
    <form id="syncCodeForm" onSubmit={submit} className="space-y-2">
      <label htmlFor="syncCodeInput" className="block text-xs text-slate-400">
        The sync code from your other device (More → Sync → Show code). On an iPhone, paste it here: the installed app
        doesn’t share storage with Safari, so the QR code opens the wrong one.
      </label>
      <div className="flex gap-2">
        <input
          id="syncCodeInput"
          name="code"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error}
          aria-describedby={error ? 'syncCodeError' : undefined}
          className="min-w-0 flex-1 h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 font-mono text-sm text-white focus:border-cyan-400 focus:outline-hidden"
        />
        <button
          type="submit"
          className="h-10 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold"
        >
          Pair
        </button>
      </div>
      {error && (
        <p id="syncCodeError" className="text-xs text-amber-300">
          That isn’t a sync code. It’s 43 letters, digits, - and _.
        </p>
      )}
    </form>
  );
}

function On({ status }: { status: SyncStatus }) {
  const now = useClock(false);
  const [showing, setShowing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const healthy = !status.problem;
  const text = status.busy
    ? 'Syncing…'
    : status.problem
      ? PROBLEM[status.problem]
      : status.at
        ? `Synced ${formatAgo(new Date(status.at).toISOString(), now)}.`
        : 'On. The first sync runs when you’re online.';
  return (
    <>
      <Line
        icon={healthy ? 'ph-check-circle text-emerald-300' : 'ph-warning-circle text-amber-300'}
        title="Sync is on"
        live
      >
        {text}
      </Line>
      {status.problem === 'gone' ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void turnOnSync()}
            className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold"
          >
            Start sync again
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={status.busy}
            className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm text-slate-200 disabled:opacity-60"
          >
            Sync now
          </button>
          <button
            type="button"
            aria-expanded={showing}
            aria-controls="syncCodeCard"
            onClick={() => {
              setShowing(!showing);
            }}
            className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm text-slate-200"
          >
            {showing ? 'Hide code' : 'Pair another device'}
          </button>
        </div>
      )}
      {showing && status.problem !== 'gone' && <CodeCard />}
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={turnOffSync}
          className="h-9 text-sm text-slate-300 hover:text-white underline-offset-4 hover:underline"
        >
          Turn off on this device
        </button>
        {confirming ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-300">Delete the cloud copy for every device?</span>
            <button
              type="button"
              onClick={() => {
                void deleteCloudCopy().then(ok => {
                  showToast(
                    ok
                      ? 'Cloud copy deleted. Your log stays on this device.'
                      : 'Couldn’t reach the sync server; the cloud copy is still there.'
                  );
                  setConfirming(false);
                });
              }}
              className="h-9 px-3 rounded-lg border border-red-500/50 bg-red-500/10 text-sm font-semibold text-red-200 hover:bg-red-500/20"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
              }}
              className="h-9 px-3 text-sm text-slate-300 hover:text-white"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirming(true);
            }}
            className="h-9 text-sm text-red-300 hover:text-red-200 underline-offset-4 hover:underline"
          >
            Delete cloud copy
          </button>
        )}
      </div>
    </>
  );
}

// The code as a QR (a link that opens the app and offers to pair) and as text to paste.
function CodeCard() {
  const code = syncCode();
  if (!code) return null;
  const link = `${location.origin}${location.pathname}#pair=${code}`;
  const copy = () => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        showToast('Sync code copied.');
      })
      .catch(() => {
        showToast('Couldn’t copy here; select the code instead.');
      });
  };
  return (
    <div id="syncCodeCard" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <QrCode text={link} />
        <p className="text-sm text-slate-300">
          Scan with the other device’s camera, or open More → Sync → I have a code there and paste the code below.
        </p>
      </div>
      <p className="break-all select-all rounded-lg bg-slate-950 px-3 py-2 font-mono text-sm text-cyan-200">{code}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-amber-300">Anyone with this code can read your log. Share it only with yourself.</p>
        <button
          type="button"
          onClick={copy}
          className="h-9 px-3 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm text-slate-200 flex items-center gap-2"
        >
          <i className="ph-bold ph-copy" aria-hidden="true" /> Copy code
        </button>
      </div>
    </div>
  );
}

function QrCode({ text }: { text: string }) {
  const { data, size } = encode(text, { ecc: 'M', border: 2 });
  const path = data
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${String(x)} ${String(y)}h1v1h-1z` : '')))
    .join('');
  return (
    <svg
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      role="img"
      aria-label="QR code that pairs another device"
      shapeRendering="crispEdges"
      className="w-44 h-44 shrink-0 rounded-lg bg-white"
    >
      <path d={path} fill="#020617" />
    </svg>
  );
}

function Line({ icon, title, live, children }: { icon: string; title: string; live?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="nav-tile" aria-hidden="true">
        <i className={`ph-bold ${icon}`} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-white">{title}</span>
        <span
          id={live ? 'syncStatus' : undefined}
          role={live ? 'status' : undefined}
          className="block text-xs text-slate-400"
        >
          {children}
        </span>
      </span>
    </div>
  );
}
