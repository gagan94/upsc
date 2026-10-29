"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { formatMinutes } from "@/lib/format";
import type { TaskView } from "@/lib/types";
import { RescheduleDialog } from "./RescheduleDialog";

/** Unscheduled tasks, each with a "Schedule" quick action. */
export function BacklogPanel({
  tasks,
  tz,
  date,
  onSchedule,
  renderActions,
}: {
  tasks: TaskView[];
  tz: string;
  /** Date (YYYY-MM-DD, user zone) offered by default when scheduling. */
  date: string;
  onSchedule: (task: TaskView, scheduledStart: string) => void;
  renderActions?: (task: TaskView) => ReactNode;
}) {
  const [scheduling, setScheduling] = useState<TaskView | null>(null);
  if (tasks.length === 0) {
    return <p className="text-sm text-muted">Your backlog is empty</p>;
  }
  return (
    <>
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 rounded-control border border-border bg-surface p-2">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-text">{t.title}</p>
              <p className="text-xs text-muted">
                {[t.durationMin ? formatMinutes(t.durationMin) : null, t.subjectTitle].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button size="sm" variant="secondary" aria-label={`Schedule ${t.title}`} onClick={() => setScheduling(t)}>
              Schedule
            </Button>
            {renderActions?.(t)}
          </li>
        ))}
      </ul>
      {scheduling ? (
        <RescheduleDialog
          open
          mode="schedule"
          task={scheduling}
          tz={tz}
          defaultDate={date}
          onClose={() => setScheduling(null)}
          onConfirm={(iso) => iso && onSchedule(scheduling, iso)}
        />
      ) : null}
    </>
  );
}
