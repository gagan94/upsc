"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TICK_MS = 500;

/**
 * Remaining seconds derived from the server's `remainingSeconds` captured when a response arrived,
 * plus the monotonic clock (`performance.now()`). The wall clock is never read, so a changed device
 * clock cannot move the timer. Call `sync` with `session.remainingSeconds` from every API response
 * that carries it. `onZero` fires at most once for the lifetime of the hook.
 */
export function useCountdown(initialSeconds: number | null, onZero: () => void) {
  const anchor = useRef<{ base: number | null; at: number }>({ base: initialSeconds, at: performance.now() });
  const [seconds, setSeconds] = useState<number | null>(initialSeconds);
  const fired = useRef(false);
  const onZeroRef = useRef(onZero);
  useEffect(() => {
    onZeroRef.current = onZero;
  });

  const tick = useCallback(() => {
    const { base, at } = anchor.current;
    if (base === null) return;
    const left = Math.max(0, Math.ceil(base - (performance.now() - at) / 1000));
    setSeconds(left);
    if (left === 0 && !fired.current) {
      fired.current = true;
      onZeroRef.current();
    }
  }, []);

  const sync = useCallback(
    (remainingSeconds: number | null, at: number = performance.now()) => {
      // `at` lets a caller anchor at the moment a request was sent, so latency never overstates the time left.
      anchor.current = { base: remainingSeconds, at };
      if (remainingSeconds === null) setSeconds(null);
      else tick();
    },
    [tick],
  );

  useEffect(() => {
    if (initialSeconds === null) return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [initialSeconds === null, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return { seconds, sync };
}
