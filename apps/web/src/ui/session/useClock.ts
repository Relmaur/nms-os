// The time for countdowns: every second while one is on screen (a refiner nearly done reads 0:12), otherwise the
// app's minute clock.
import { useEffect, useState } from 'react';
import { useNow } from '../useNow.ts';

export function useClock(seconds: boolean): number {
  const minute = useNow();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!seconds) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [seconds]);
  return seconds ? Math.max(now, minute) : minute;
}
