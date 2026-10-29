"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import type { TaskView } from "@/lib/types";
import { BacklogPanel } from "./BacklogPanel";
import { TaskActions } from "./TaskActions";
import { TaskDialog, type SubjectOption } from "./TaskDialog";
import { usePlannerMutations } from "./usePlannerMutations";

/** Full Backlog tab: unscheduled tasks with Schedule, edit, skip and delete. */
export function BacklogView({
  unscheduled,
  subjects,
  tz,
  date,
}: {
  unscheduled: TaskView[];
  subjects: SubjectOption[];
  tz: string;
  date: string;
}) {
  const m = usePlannerMutations({ date, tz, subjects, initial: { tasks: [], overdue: [], unscheduled } });
  const [editing, setEditing] = useState<TaskView | "new" | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {m.failed ? (
        <Banner tone="error">
          <div className="flex items-center justify-between gap-3">
            <span>
              <strong>Task save failed</strong>. Your change was undone. Please try again.
            </span>
            <Button size="sm" variant="secondary" onClick={m.dismissFailed}>
              Dismiss
            </Button>
          </div>
        </Banner>
      ) : null}
      {m.undo ? (
        <Banner tone="info">
          <div className="flex items-center justify-between gap-3">
            <span>Task deleted.</span>
            <Button size="sm" variant="secondary" onClick={() => void m.undoDelete()}>
              Undo
            </Button>
          </div>
        </Banner>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text">Backlog</h2>
          <p className="text-sm text-muted">Tasks without a date. Schedule them when you are ready.</p>
        </div>
        <Button onClick={() => setEditing("new")}>Add task</Button>
      </div>
      <BacklogPanel
        tasks={m.unscheduled}
        tz={tz}
        date={date}
        onSchedule={(t, iso) => void m.reschedule(t, iso)}
        renderActions={(t) => (
          <TaskActions
            task={t}
            tz={tz}
            defaultDate={date}
            handlers={{
              onComplete: (x, min) => void m.complete(x, min),
              onSkip: (x) => void m.skip(x),
              onReschedule: (x, iso) => void m.reschedule(x, iso),
              onEdit: (x) => setEditing(x),
              onDelete: (x) => void m.remove(x),
            }}
          />
        )}
      />
      {editing ? (
        <TaskDialog
          open
          task={editing === "new" ? undefined : editing}
          subjects={subjects}
          tz={tz}
          onClose={() => setEditing(null)}
          onSubmit={(fields) => (editing === "new" ? m.create(fields) : m.update(editing, fields))}
        />
      ) : null}
    </div>
  );
}
