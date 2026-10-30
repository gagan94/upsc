"use client";

import { useEffect, useRef } from "react";

export const HEARTBEAT_MS = 30_000;
export const IDLE_MS = 3 * 60_000;
const EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

/**
 * While `active`, calls `onBeat(interacted)` every 30 s, where `interacted` means a pointer/key event
 * happened since the previous beat. With `watchIdle`, 3 minutes without any event calls `onIdle` instead
 * of beating (the owner pauses the session, which sends the final heartbeat itself).
 * The page-visibility API pauses nothing; becoming visible again only beats at once, so a session that
 * went stale while the machine slept is detected immediately.
 */
export function useHeartbeat({
  active,
  watchIdle = true,
  onBeat,
  onIdle,
}: {
  active: boolean;
  watchIdle?: boolean;
  onBeat: (interacted: boolean) => unknown;
  onIdle: () => void;
}) {
  const beat = useRef(onBeat);
  const idle = useRef(onIdle);
  beat.current = onBeat;
  idle.current = onIdle;

  useEffect(() => {
    if (!active) return;
    let interacted = false;
    let lastEvent = Date.now();
    let inFlight = false;
    const mark = () => {
      interacted = true;
      lastEvent = Date.now();
    };
    const send = async () => {
      if (inFlight) return;
      const was = interacted;
      interacted = false;
      inFlight = true;
      try {
        await beat.current(was);
      } finally {
        inFlight = false;
      }
    };
    const onTick = () => {
      if (watchIdle && Date.now() - lastEvent >= IDLE_MS) {
        idle.current();
        return;
      }
      void send();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void send();
    };
    for (const e of EVENTS) document.addEventListener(e, mark, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(onTick, HEARTBEAT_MS);
    return () => {
      clearInterval(id);
      for (const e of EVENTS) document.removeEventListener(e, mark);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, watchIdle]);
}
