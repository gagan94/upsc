"use client";

import { formatMinutes } from "@/lib/format";
import { formatDayShort, formatTimeLabel } from "@/lib/planner-time";
import type { TaskView } from "@/lib/types";
import { ACTIVITY_LABELS } from "./TaskDialog";
import { TaskActions, type TaskHandlers } from "./TaskActions";

export function TaskRow({
  task,
  tz,
  defaultDate,
  showDate = false,
  ...handlers
}: { task: TaskView; tz: string; defaultDate?: string; showDate?: boolean } & TaskHandlers) {
  const done = task.status === "completed";
  const skipped = task.status === "skipped";
  const open = task.status === "todo" || task.status === "in_progress";
  const when = task.scheduledStart
    ? [showDate ? formatDayShort(task.scheduledStart, tz) : null, formatTimeLabel(task.scheduledStart, tz)].filter(Boolean).join(", ")
    : null;
  const meta = [
    when,
    task.durationMin ? formatMinutes(task.durationMin) : null,
    task.subjectTitle,
    ACTIVITY_LABELS[task.activityType],
  ].filter(Boolean);
  return (
    <li className="flex items-start gap-3 rounded-card border border-border bg-surface p-3">
      {open ? (
        <button
          type="button"
          aria-label={`Mark ${task.title} complete`}
          onClick={() => handlers.onComplete(task)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-border hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      ) : (
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${done ? "bg-primary text-primary-text" : "border border-border text-muted"}`}
        >
          {done ? "✓" : "–"}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className={`break-words font-semibold ${done ? "text-muted line-through" : skipped ? "text-muted" : "text-text"}`}>
            {task.title}
          </span>
          {done ? <span className="rounded-full bg-bg px-2 text-xs font-semibold text-primary">Completed</span> : null}
          {skipped ? <span className="rounded-full bg-bg px-2 text-xs font-semibold text-muted">Skipped</span> : null}
          {task.priority === "high" ? <span className="rounded-full bg-bg px-2 text-xs font-semibold text-danger">High priority</span> : null}
        </p>
        {meta.length ? <p className="mt-0.5 text-xs text-muted">{meta.join(" · ")}</p> : null}
        {done && task.actualMin !== null ? <p className="mt-0.5 text-xs text-muted">Actual {formatMinutes(task.actualMin)}</p> : null}
      </div>
      <TaskActions task={task} tz={tz} defaultDate={defaultDate ?? ""} handlers={handlers} />
    </li>
  );
}
