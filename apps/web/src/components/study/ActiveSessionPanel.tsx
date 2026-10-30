"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/format";
import { useOptionalStudySession } from "./StudySessionProvider";

/** Larger view of the running session (history page): timer, progress against the target, controls. */
export function ActiveSessionPanel() {
  const s = useOptionalStudySession();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  if (!s?.session || s.session.stale) return null;
  const { session } = s;
  const target = session.plannedMin * 60;
  const pct = Math.min(100, Math.round((s.seconds / target) * 100));
  return (
    <section aria-label="Active session" className="rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{session.status === "paused" ? "Paused" : "Studying now"} · target {session.plannedMin} min</p>
          <p className="font-mono text-3xl font-bold tabular-nums text-text">{formatDuration(s.seconds)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {session.status === "paused" ? (
            <Button onClick={() => void s.resume()}>Resume session</Button>
          ) : (
            <Button variant="secondary" onClick={() => void s.pause()}>
              Pause session
            </Button>
          )}
          <Button variant="secondary" onClick={s.openEnd}>
            End session
          </Button>
          {confirmDiscard ? (
            <Button variant="danger" onClick={() => void s.discard()}>
              Confirm discard
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDiscard(true)}>
              Discard
            </Button>
          )}
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Progress towards target"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-3 h-2 overflow-hidden rounded-full bg-bg"
      >
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
