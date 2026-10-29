import { formatDateLong } from "@/lib/format";
import { formatMinutes } from "@/lib/format";
import { localDate } from "@/lib/time";
import type { NewTask } from "@/lib/types";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PreviewState } from "./useOnboarding";

interface Group {
  key: string;
  label: string;
  tasks: NewTask[];
}

export function groupByDay(tasks: NewTask[], tz: string): Group[] {
  const map = new Map<string, Group>();
  const sorted = [...tasks].sort((a, b) => (a.scheduledStart ?? "9").localeCompare(b.scheduledStart ?? "9"));
  for (const t of sorted) {
    const key = t.scheduledStart ? localDate(new Date(t.scheduledStart), tz) : "unscheduled";
    let g = map.get(key);
    if (!g) {
      g = { key, label: t.scheduledStart ? formatDateLong(t.scheduledStart, tz) : "Not scheduled yet", tasks: [] };
      map.set(key, g);
    }
    g.tasks.push(t);
  }
  return [...map.values()];
}

function timeOf(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function Review({
  preview,
  tz,
  busy,
  onAccept,
  onEmpty,
  onRetryPreview,
}: {
  preview: PreviewState;
  tz: string;
  busy: boolean;
  onAccept: () => void;
  onEmpty: () => void;
  onRetryPreview: () => void;
}) {
  const tasks = preview.kind === "ready" ? preview.tasks : [];
  const total = tasks.reduce((n, t) => n + (t.durationMin ?? 0), 0);
  return (
    <div className="flex flex-col gap-4">
      {preview.kind === "loading" ? (
        <div aria-busy="true" aria-label="Building your plan" className="flex flex-col gap-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : preview.kind === "error" ? (
        <Banner tone="error">
          <p className="font-semibold">We couldn&apos;t build your plan preview</p>
          <p className="mt-1">You can try again, go back to check your routine, or start with an empty planner.</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={onRetryPreview}>
            Try again
          </Button>
        </Banner>
      ) : tasks.length === 0 ? (
        <Banner tone="info">We have no starter tasks to suggest yet.</Banner>
      ) : (
        <>
          <p className="text-sm text-text">
            A starter week based on your answers. Total: {formatMinutes(total)} across {tasks.length} {tasks.length === 1 ? "task" : "tasks"}.
          </p>
          <div className="flex flex-col gap-3">
            {groupByDay(tasks, tz).map((g) => (
              <div key={g.key} role="group" aria-label={g.label} className="rounded-card border border-border bg-surface p-4">
                <h2 className="text-sm font-bold text-text">{g.label}</h2>
                <ul className="mt-2 flex flex-col gap-2">
                  {g.tasks.map((t, i) => (
                    <li key={`${t.title}-${i}`} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-text">{t.title}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {t.scheduledStart ? `${timeOf(t.scheduledStart, tz)} · ` : ""}
                        {formatMinutes(t.durationMin ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="flex flex-wrap gap-3">
        {tasks.length > 0 ? (
          <Button onClick={onAccept} disabled={busy}>
            Accept plan and start
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onEmpty} disabled={busy || preview.kind === "loading"}>
          Start with an empty planner
        </Button>
      </div>
    </div>
  );
}
