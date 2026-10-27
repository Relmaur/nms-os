// The current time for relative labels ("Here 10m ago", "Ready in 3h"): refreshed every minute, whenever the app
// comes back to the foreground (e.g. after an hour in-game), and after every state change, so a visit just logged
// reads "just now" rather than against a clock up to a minute old.
import { useEffect, useState } from 'react';
import { subscribe } from '../app/store.ts';

const TICK_MS = 60_000;

export function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    const timer = setInterval(tick, TICK_MS);
    document.addEventListener('visibilitychange', tick);
    const unsubscribe = subscribe(tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      unsubscribe();
    };
  }, []);
  return now;
}
