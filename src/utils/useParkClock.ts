import { useEffect, useState } from 'react';
import { madridDayKey, nextMadridMidnight } from './madridTime';

export function useParkClock(nowMs?: number): number {
  const [value, setValue] = useState(() => nowMs ?? Date.now());

  useEffect(() => {
    if (nowMs != null) {
      setValue(nowMs);
      return;
    }
    let timer = 0;
    const tick = () => setValue(Date.now());
    const arm = () => {
      window.clearTimeout(timer);
      const delay = Math.min(Math.max(nextMadridMidnight(Date.now()) - Date.now(), 1000), 60 * 60 * 1000);
      timer = window.setTimeout(() => {
        tick();
        arm();
      }, delay);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    arm();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [nowMs]);

  useEffect(() => {
    if (nowMs != null) return;
    const day = madridDayKey(value);
    const until = nextMadridMidnight(value) - value;
    if (until < 0) setValue(Date.now());
    void day;
  }, [nowMs, value]);

  return value;
}
