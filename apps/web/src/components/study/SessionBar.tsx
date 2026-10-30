"use client";

import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/format";
import { useOptionalStudySession } from "./StudySessionProvider";

/** Top-bar entry point: start a session, or see/pause/end the running one. Renders nothing outside the provider. */
export function SessionBar() {
  const s = useOptionalStudySession();
  if (!s || (!s.loaded && !s.loadFailed)) return null;
  const { session } = s;

  let body;
  if (s.loadFailed && !session) {
    body = (
      <>
        <span role="alert" className="text-danger">
          Couldn&apos;t load your session
        </span>
        <Button size="sm" variant="secondary" onClick={s.retryLoad}>
          Retry
        </Button>
      </>
    );
  } else if (!session) {
    body = (
      <>
        <span className="text-muted">No active session</span>
        <span aria-hidden="true" className="text-muted">
          ·
        </span>
        <button
          type="button"
          onClick={() => s.openStart()}
          className="rounded-control font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Study session
        </button>
      </>
    );
  } else if (session.stale) {
    body = (
      <Button size="sm" variant="secondary" onClick={s.openRecovery}>
        Session needs recovery
      </Button>
    );
  } else {
    body = (
      <>
        <span role="timer" className="font-mono text-base font-bold tabular-nums text-text">
          {formatDuration(s.seconds)}
        </span>
        <span className="hidden text-xs text-muted sm:inline">of {session.plannedMin} min{session.status === "paused" ? " · Paused" : ""}</span>
        {session.status === "paused" ? (
          <Button size="sm" onClick={() => void s.resume()}>
            Resume
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => void s.pause()}>
            Pause
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={s.openEnd}>
          End
        </Button>
      </>
    );
  }

  return (
    <div role="group" className="flex items-center gap-2 rounded-control border border-border bg-bg px-3 py-1.5 text-sm" aria-label="Study session">
      {body}
      {s.error ? (
        <span role="alert" className="text-xs font-semibold text-danger">
          {s.error}
        </span>
      ) : null}
    </div>
  );
}
