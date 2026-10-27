// More → Sync: turn sync on, pair another device (QR code or the code typed in), see how it's going, and turn it off
// or delete the cloud copy (ADR-0005). Opt-in; nothing leaves the device before Turn on or Pair.
import { useState, type ReactNode, type SyntheticEvent } from 'react';
import { encode } from 'uqr';
import { formatAgo } from '@atlas/core/format';
import { showToast } from '../../app/ui.ts';
import {
  answerPairing,
  answerReview,
  deleteCloudCopy,
  pairWith,
  restoreBeforeSync,
  SYNC_URL,
  syncCode,
  syncNow,
  turnOffSync,
  turnOnSync,
  useSyncStatus,
  type SyncStatus
} from '../../app/sync.ts';
import { useClock } from '../session/useClock.ts';
import { untilText, useRelayStatus } from '../../app/relay-status.ts';
import { KOFI_URL } from '../../app/support.ts';
import type { Removal } from '@atlas/core/sync';

// When the free server is the limit: one quiet invitation to help upgrade it.
export function SupportLine() {
  return (
    <p className="text-xs text-slate-400">
      ATLAS runs on donations.{' '}
      <a href={KOFI_URL} target="_blank" rel="noopener" className="text-cyan-300 underline underline-offset-2">
        A coffee on Ko-fi
      </a>{' '}
      helps upgrade the server.
    </p>
  );
}

const PROBLEM: Record<NonNullable<SyncStatus['problem']>, (until: string) => string> = {
  offline: () => 'Offline. Changes stay on this device and sync when you’re back online.',
  server: () => 'Couldn’t reach the sync server. Your log is safe on this device; it tries again soon.',
  gone: () => 'The cloud copy was deleted from another device. Start again to upload this log with a new code.',
  damaged: () => 'The cloud copy couldn’t be opened with this code. Nothing here was changed.',
  storage: () => 'This device’s storage is full, so sync is paused. Free some space, or export a backup.',
  capacity: until =>
    `ATLAS’s free sync server is full for today. Your log is safe on this device and syncs again after ${until}.`,
  busy: until =>
    `The sync server isn’t taking new players today, so sync starts after ${until}. Your log is safe on this device.`,
  unknown: () =>
    'No synced log uses that code, so nothing was paired. Check the code, or turn on sync on your other device first.',
  older: () =>
    'The cloud copy is older than one this device already synced, so it wasn’t used. Your log here is unchanged.',
  review: () => 'This sync would remove a lot from your log, so it’s waiting for you.'
};

export function Sync() {
  const status = useSyncStatus();
  if (!SYNC_URL) return null; // a build without a relay (e.g. a fork): Export/Import still move the log
  return (
    <div className="space-y-2">
      <h2 className="list-heading">Sync</h2>
      <div id="syncPanel" className="list-group p-4 space-y-4">
        {status.pending && <PairPrompt replacing={status.enabled} />}
        {status.review && <Review removal={status.review} />}
        {status.restorable && <Restore />}
        {status.enabled ? <On status={status} /> : <Off problem={status.problem} />}
        <p className="text-xs text-slate-400 leading-relaxed">
          Your log is encrypted on this device before it’s sent; the server keeps a locked copy it can’t open, and
          deletes it after a year without syncing. Lose every device and the code, and that copy can’t be recovered.
        </p>
      </div>
    </div>
  );
}

// Pairing gives whoever made the code your log, and theirs to you: only ever with your own devices. Replacing a sync
// already on here takes a second, explicit tap.
function PairPrompt({ replacing }: { replacing: boolean }) {
  const [sure, setSure] = useState(false);
  return (
    <div role="alert" className="rounded-xl border border-cyan-500/40 bg-cyan-500/[0.07] p-3.5 space-y-3">
      <p className="text-sm text-slate-200">
        Pair this device with the code you scanned? Its log and the synced log are merged.{' '}
        <strong className="text-white">Only pair with a code from your own device:</strong> whoever made it can read,
        change and erase your log.
      </p>
      {replacing && (
        <p className="text-sm text-amber-200">
          This device already syncs with another code. Pairing replaces that sync here (the other copy stays in the
          cloud).
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (replacing && !sure) setSure(true);
            else void answerPairing(true);
          }}
          className="h-10 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold"
        >
          {replacing && !sure ? 'Replace and pair' : replacing ? 'Yes, replace it' : 'Pair'}
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

const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? '' : 's'}`;

function Review({ removal }: { removal: Removal }) {
  const parts = [
    removal.systems && plural(removal.systems, 'system'),
    removal.planets && plural(removal.planets, 'planet'),
    removal.visits && plural(removal.visits, 'visit'),
    removal.gear && plural(removal.gear, 'ship or Multi-Tool'),
    removal.notes && plural(removal.notes, 'note')
  ].filter(Boolean);
  return (
    <div
      id="syncReview"
      role="alert"
      className="rounded-xl border border-amber-500/40 bg-amber-500/[0.07] p-3.5 space-y-3"
    >
      <p className="text-sm text-slate-200">
        This sync would remove <strong className="text-white">{parts.join(', ')}</strong> ({removal.total} of{' '}
        {removal.before} records). If you deleted them on another device, apply it: your log from before is kept here,
        so you can put it back. If not, keep this device’s log: it replaces the cloud copy.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void answerReview('apply')}
          className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-semibold"
        >
          Apply the removal
        </button>
        <button
          type="button"
          onClick={() => void answerReview('keep')}
          className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm text-slate-200"
        >
          Keep this device’s log
        </button>
      </div>
    </div>
  );
}

function Restore() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <p className="text-xs text-slate-300">Your log from before the last big removal is kept on this device.</p>
      <button
        type="button"
        onClick={() => {
          showToast(restoreBeforeSync() ? 'Put back. It syncs to your other devices next.' : 'Couldn’t put it back.');
        }}
        className="h-9 px-3 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm text-slate-200"
      >
        Put it back
      </button>
    </div>
  );
}

function Off({ problem }: { problem: SyncStatus['problem'] }) {
  const [entering, setEntering] = useState(problem === 'unknown');
  return (
    <>
      <Line icon="ph-arrows-clockwise text-slate-400" title="Sync between your devices" live>
        {problem === 'unknown'
          ? PROBLEM.unknown('')
          : 'Your log on your PC and your phone, kept in step. No account needed.'}
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
        The sync code from your other device (More → Sync → Pair another device). Only use a code from your own device:
        whoever made it can read and change your log. On an iPhone, paste it here: the installed app doesn’t share
        storage with Safari, so the QR code opens the wrong one.
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
  const relay = useRelayStatus();
  const healthy = !status.problem;
  const text = status.busy
    ? 'Syncing…'
    : status.problem
      ? PROBLEM[status.problem](untilText(relay.until))
      : status.at
        ? `Synced ${formatAgo(new Date(status.at).toISOString(), now)}.`
        : 'On. The first sync runs when you’re online.';
  const id = status.fingerprint ? ` Copy ID ${status.fingerprint}: the same on all your devices.` : '';
  return (
    <>
      <Line
        icon={healthy ? 'ph-check-circle text-emerald-300' : 'ph-warning-circle text-amber-300'}
        title="Sync is on"
        live
      >
        {text}
        {healthy && !status.busy && id}
      </Line>
      {(status.problem === 'capacity' || status.problem === 'busy') && <SupportLine />}
      {status.problem === 'older' && (
        <button
          type="button"
          onClick={() => void answerReview('keep')}
          className="self-start h-10 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm text-slate-200"
        >
          Keep this device’s log (replaces the cloud copy)
        </button>
      )}
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
          {/* Only once the copy is in the cloud: a code shared before that would pair with nothing. */}
          {status.at !== null && (
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
          )}
        </div>
      )}
      {showing && status.at !== null && status.problem !== 'gone' && <CodeCard />}
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

// The code as a QR (a link that opens the app and offers to pair) and as text to paste. Hidden until asked for: it's
// the key to the whole log, and screens get streamed and screenshotted.
function CodeCard() {
  const code = syncCode();
  const [revealed, setRevealed] = useState(false);
  if (!code) return null;
  if (!revealed)
    return (
      <div id="syncCodeCard" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <p className="text-sm text-amber-200">
          The code is the key to your whole log: anyone who sees it can read and change it. Don’t show it on a stream or
          in a screenshot.
        </p>
        <button
          type="button"
          onClick={() => {
            setRevealed(true);
          }}
          className="h-10 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold"
        >
          Show the code
        </button>
      </div>
    );
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
