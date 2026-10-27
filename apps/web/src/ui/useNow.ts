// The current time for relative labels ("Here 10m ago", "Ready in 3h"): refreshed every minute and whenever the
// app comes back to the foreground (e.g. after an hour in-game).
import { useEffect, useState } from 'react';

const TICK_MS = 60_000;

export function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    const timer = setInterval(tick, TICK_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}
