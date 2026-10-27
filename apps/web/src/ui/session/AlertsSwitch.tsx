// "Alerts when the app is asleep" (ADR-0006): the opt-in switch for timer pushes, in the Session sheet and More.
import { disablePush, enablePush, usePushStatus, type PushStatus } from '../../app/push.ts';

const NOTE: Record<NonNullable<PushStatus['problem']>, string> = {
  denied: 'Notifications are off for this site in the browser’s settings; allow them, then try again.',
  offline: 'Offline. Your timers go to the alert server when you’re back online.',
  server: 'Couldn’t reach the alert server. Alerts still come while the app is open.'
};

export function AlertsSwitch({ id }: { id: string }) {
  const push = usePushStatus();
  if (push.support === 'no') return null;
  if (push.support === 'install')
    return (
      <p className="text-xs text-slate-400 leading-relaxed">
        For alerts while the app is asleep, add it to your Home Screen (Share → Add to Home Screen, iOS 16.4 or later)
        and turn them on there.
      </p>
    );
  const label = `${id}Label`;
  const note = `${id}Note`;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex-1 min-w-0">
          <span id={label} className="block text-sm text-white">
            Alerts when the app is asleep
          </span>
          <span id={note} className="block text-xs text-slate-400">
            Your device’s push address and each timer’s end time go to the alert server; timer names stay here.
          </span>
        </span>
        <button
          type="button"
          id={id}
          role="switch"
          aria-checked={push.enabled}
          aria-labelledby={label}
          aria-describedby={note}
          disabled={push.busy}
          onClick={() => void (push.enabled ? disablePush() : enablePush())}
          className="switch disabled:opacity-60"
        />
      </div>
      {/* Always in the page, so screen readers announce a problem when its text appears. */}
      <p role="status" className="mt-1.5 text-xs text-amber-300 empty:hidden">
        {push.problem ? NOTE[push.problem] : ''}
      </p>
    </div>
  );
}
