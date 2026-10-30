export type TimerTone = "normal" | "amber" | "red";

export const AMBER_AT_SECONDS = 300;
export const RED_AT_SECONDS = 60;

export const toneFor = (seconds: number): TimerTone => (seconds <= RED_AT_SECONDS ? "red" : seconds <= AMBER_AT_SECONDS ? "amber" : "normal");

export function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const TONES: Record<TimerTone, string> = {
  normal: "border-border bg-surface text-text",
  amber: "border-amber-500 bg-amber-100 text-amber-950",
  red: "border-danger-border bg-danger-bg text-danger",
};

/** The message is derived from the threshold the timer is in, so it changes (and is announced) only on crossing one. */
const announcement = (seconds: number): string =>
  seconds <= 0 ? "Time is up" : seconds <= RED_AT_SECONDS ? "1 minute remaining" : seconds <= AMBER_AT_SECONDS ? "5 minutes remaining" : "";

export function TimerBadge({ seconds }: { seconds: number }) {
  const tone = toneFor(seconds);
  return (
    <>
      <span data-testid="timer-badge" data-tone={tone} className={`rounded-control border px-3 py-1.5 text-sm font-bold tabular-nums ${TONES[tone]}`}>
        {formatClock(seconds)} remaining
      </span>
      <span data-testid="timer-announcement" aria-live="polite" role="status" className="sr-only">
        {announcement(seconds)}
      </span>
    </>
  );
}
