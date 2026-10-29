"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { localDate } from "@/lib/time";
import type { NewTask, TaskView } from "@/lib/types";
import type { SubjectOption, TaskFields } from "./TaskDialog";

export const UNDO_MS = 5000;

interface Lists {
  tasks: TaskView[];
  overdue: TaskView[];
  unscheduled: TaskView[];
}

const byStart = (a: TaskView, b: TaskView) => (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? "") || a.id.localeCompare(b.id);

function without(s: Lists, id: string): Lists {
  return {
    tasks: s.tasks.filter((t) => t.id !== id),
    overdue: s.overdue.filter((t) => t.id !== id),
    unscheduled: s.unscheduled.filter((t) => t.id !== id),
  };
}

/** Remove the task wherever it is, then file it where it belongs for `date` in `tz`. */
function place(s: Lists, t: TaskView, date: string, tz: string): Lists {
  const n = without(s, t.id);
  if (!t.scheduledStart) return { ...n, unscheduled: [...n.unscheduled, t] };
  const day = localDate(new Date(t.scheduledStart), tz);
  if (day === date) return { ...n, tasks: [...n.tasks, t].sort(byStart) };
  if (day < date && (t.status === "todo" || t.status === "in_progress")) return { ...n, overdue: [...n.overdue, t].sort(byStart) };
  return n;
}

const post = (path: string, body?: unknown) =>
  apiFetch<{ task: TaskView }>(path, { method: "POST", body: JSON.stringify(body ?? {}) }).then((r) => r.task);

export function usePlannerMutations({
  date,
  tz,
  subjects,
  initial,
}: {
  date: string;
  tz: string;
  subjects: SubjectOption[];
  initial: Lists;
}) {
  const [lists, setLists] = useState<Lists>(initial);
  const [failed, setFailed] = useState(false);
  const [undo, setUndo] = useState<TaskView | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const put = useCallback((t: TaskView) => setLists((s) => place(s, t, date, tz)), [date, tz]);

  /** Apply `next` now; on failure put `orig` back and raise the banner. */
  const optimistic = useCallback(
    async (orig: TaskView, next: TaskView, call: () => Promise<TaskView>): Promise<boolean> => {
      put(next);
      try {
        put(await call());
        return true;
      } catch {
        put(orig);
        setFailed(true);
        return false;
      }
    },
    [put],
  );

  const api = useMemo(
    () => ({
      complete: (t: TaskView, actualMin?: number) =>
        optimistic(
          t,
          { ...t, status: "completed", completedAt: new Date().toISOString(), actualMin: actualMin ?? t.actualMin },
          () => post(`/planner/tasks/${t.id}/complete`, actualMin !== undefined ? { actualMin } : {}),
        ),
      skip: (t: TaskView) =>
        optimistic(t, { ...t, status: "skipped", completedAt: null }, () => post(`/planner/tasks/${t.id}/skip`)),
      reschedule: (t: TaskView, scheduledStart: string | null) =>
        optimistic(t, { ...t, scheduledStart }, () => post(`/planner/tasks/${t.id}/reschedule`, { scheduledStart })),
      update: (t: TaskView, patch: TaskFields) => {
        const next: TaskView = { ...t, ...(patch as Partial<TaskView>) };
        if (patch.subjectNodeId !== undefined) {
          next.subjectTitle = subjects.find((s) => s.id === patch.subjectNodeId)?.title ?? null;
        }
        return optimistic(t, next, () =>
          apiFetch<{ task: TaskView }>(`/planner/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify(patch) }).then((r) => r.task),
        );
      },
      create: async (fields: TaskFields): Promise<boolean> => {
        try {
          put(await post("/planner/tasks", fields));
          return true;
        } catch {
          setFailed(true);
          return false;
        }
      },
      remove: async (t: TaskView): Promise<boolean> => {
        setLists((s) => without(s, t.id));
        try {
          await apiFetch<void>(`/planner/tasks/${t.id}`, { method: "DELETE" });
        } catch {
          put(t);
          setFailed(true);
          return false;
        }
        clearTimer();
        setUndo(t);
        timer.current = setTimeout(() => setUndo(null), UNDO_MS);
        return true;
      },
      undoDelete: async (): Promise<boolean> => {
        const t = undo;
        if (!t) return false;
        clearTimer();
        setUndo(null);
        const body: NewTask = { title: t.title };
        if (t.subjectNodeId) body.subjectNodeId = t.subjectNodeId;
        body.activityType = t.activityType;
        if (t.durationMin !== null) body.durationMin = t.durationMin;
        if (t.scheduledStart) body.scheduledStart = t.scheduledStart;
        body.priority = t.priority;
        if (t.linked) body.linked = t.linked;
        if (t.notes) body.notes = t.notes;
        try {
          put(await post("/planner/tasks", body));
          return true;
        } catch {
          setFailed(true);
          return false;
        }
      },
    }),
    [optimistic, put, subjects, undo],
  );

  const stats = useMemo(() => {
    const open = lists.tasks.filter((t) => t.status !== "skipped");
    return {
      plannedMin: open.reduce((s, t) => s + (t.durationMin ?? 0), 0),
      completed: lists.tasks.filter((t) => t.status === "completed").length,
      total: lists.tasks.length,
    };
  }, [lists.tasks]);

  return { ...lists, stats, failed, dismissFailed: () => setFailed(false), undo, ...api };
}
