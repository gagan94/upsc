"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatMinutes } from "@/lib/format";
import { groupByDay, plannedMinutes } from "@/lib/planner-days";
import { formatDayShort, formatTimeLabel, localTime, zonedInstant } from "@/lib/planner-time";
import { addDays } from "@/lib/time";
import type { TaskView } from "@/lib/types";
import { weekDays } from "@/lib/week";
import { MoveMenu } from "./MoveMenu";
import { MutationBanners } from "./MutationBanners";
import { TaskDialog, DEFAULT_TIME, type SubjectOption } from "./TaskDialog";
import { usePlannerMutations } from "./usePlannerMutations";

const href = (date: string) => `/planner?view=week&date=${date}`;

/** Seven columns (starting at `weekStart`) of compact task cards; days are the USER's days in `tz`. */
export function WeekView({
  weekStart,
  tasks,
  subjects,
  tz,
  today,
}: {
  weekStart: string;
  tasks: TaskView[];
  subjects: SubjectOption[];
  tz: string;
  today: string;
}) {
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const last = days[6];
  const m = usePlannerMutations({ date: weekStart, to: last, tz, subjects, initial: { tasks, overdue: [], unscheduled: [] } });
  const [editing, setEditing] = useState<TaskView | "new" | null>(null);
  const byDay = useMemo(() => groupByDay(m.tasks, tz), [m.tasks, tz]);

  function move(t: TaskView, day: string | null) {
    if (day === null) return void m.reschedule(t, null);
    const time = t.scheduledStart ? localTime(t.scheduledStart, tz) : DEFAULT_TIME;
    void m.reschedule(t, zonedInstant(day, time, tz));
  }

  return (
    <div className="flex flex-col gap-4">
      <MutationBanners failed={m.failed} onDismiss={m.dismissFailed} undo={m.undo !== null} onUndo={() => void m.undoDelete()} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={href(addDays(weekStart, -7))} aria-label="Previous week" className="rounded-control border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg">
            <span aria-hidden="true">‹</span>
          </Link>
          <h2 className="text-lg font-bold text-text">
            {formatDayShort(weekStart, tz)} – {formatDayShort(last, tz)}
          </h2>
          <Link href={href(addDays(weekStart, 7))} aria-label="Next week" className="rounded-control border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg">
            <span aria-hidden="true">›</span>
          </Link>
        </div>
        <Button onClick={() => setEditing("new")}>Add task</Button>
      </div>

      <div className="grid grid-cols-1 gap-gap md:grid-cols-7">
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const isToday = d === today;
          const label = formatDayShort(d, tz);
          return (
            <section
              key={d}
              role="group"
              aria-label={label}
              aria-current={isToday ? "date" : undefined}
              className={`flex min-w-0 flex-col gap-2 rounded-card border p-2 ${isToday ? "border-primary bg-surface ring-1 ring-primary" : "border-border bg-surface"}`}
            >
              <header>
                <h3 className="text-sm font-bold text-text">
                  <Link href={`/planner?view=today&date=${d}`} className="hover:underline">
                    {label}
                  </Link>
                  {isToday ? <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-text">Today</span> : null}
                </h3>
                <p className="text-xs text-muted">{formatMinutes(plannedMinutes(list))} planned</p>
              </header>
              {list.length === 0 ? <p className="text-xs text-muted">Nothing planned</p> : null}
              <ul className="flex flex-col gap-2">
                {list.map((t) => (
                  <Card key={t.id} task={t} tz={tz} day={d} days={days} onOpen={() => setEditing(t)} onMove={(day) => move(t, day)} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {editing ? (
        <TaskDialog
          open
          task={editing === "new" ? undefined : editing}
          defaultDate={editing === "new" ? (days.includes(today) ? today : weekStart) : undefined}
          subjects={subjects}
          tz={tz}
          onClose={() => setEditing(null)}
          onSubmit={(fields) => (editing === "new" ? m.create(fields) : m.update(editing, fields))}
        />
      ) : null}
    </div>
  );
}

function Card({
  task,
  tz,
  day,
  days,
  onOpen,
  onMove,
}: {
  task: TaskView;
  tz: string;
  day: string;
  days: string[];
  onOpen: () => void;
  onMove: (day: string | null) => void;
}) {
  const done = task.status === "completed";
  const skipped = task.status === "skipped";
  return (
    <li className="rounded-control border border-border bg-bg p-2">
      <button
        type="button"
        aria-label={`Open ${task.title}`}
        onClick={onOpen}
        className="block w-full text-left focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className={`block break-words text-sm font-semibold ${done ? "text-muted line-through" : skipped ? "text-muted" : "text-text"}`}>{task.title}</span>
        <span className="block text-xs text-muted">
          {[formatTimeLabel(task.scheduledStart!, tz), task.durationMin ? formatMinutes(task.durationMin) : null, done ? "Completed" : skipped ? "Skipped" : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {task.subjectTitle ? <span className="block text-xs text-muted">{task.subjectTitle}</span> : null}
      </button>
      <MoveMenu title={task.title} days={days} currentDay={day} onMove={onMove} />
    </li>
  );
}
