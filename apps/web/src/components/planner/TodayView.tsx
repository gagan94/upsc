"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { formatDateLong, formatMinutes } from "@/lib/format";
import { addDays } from "@/lib/time";
import type { TaskView, TodayView as TodayData } from "@/lib/types";
import { BacklogPanel } from "./BacklogPanel";
import { OverdueBanner } from "./OverdueBanner";
import { OverloadBanner } from "./OverloadBanner";
import type { TaskHandlers } from "./TaskActions";
import { TaskDialog, type SubjectOption } from "./TaskDialog";
import { TaskRow } from "./TaskRow";
import { usePlannerMutations } from "./usePlannerMutations";

const href = (date: string) => `/planner?view=today&date=${date}`;

export function TodayView({
  today,
  unscheduled,
  subjects,
  tz,
}: {
  today: TodayData;
  unscheduled: TaskView[];
  subjects: SubjectOption[];
  tz: string;
}) {
  const router = useRouter();
  const m = usePlannerMutations({
    date: today.date,
    tz,
    subjects,
    initial: { tasks: today.tasks, overdue: today.overdue, unscheduled },
  });
  const [editing, setEditing] = useState<TaskView | "new" | null>(null);

  const handlers: TaskHandlers = {
    onComplete: (t, min) => void m.complete(t, min),
    onSkip: (t) => void m.skip(t),
    onReschedule: (t, iso) => void m.reschedule(t, iso),
    onEdit: (t) => setEditing(t),
    onDelete: (t) => void m.remove(t),
  };
  const row = (t: TaskView, showDate = false) => (
    <TaskRow key={t.id} task={t} tz={tz} defaultDate={today.date} showDate={showDate} {...handlers} />
  );
  const todo = m.tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const done = m.tasks.filter((t) => t.status === "completed");
  const skipped = m.tasks.filter((t) => t.status === "skipped");
  const empty = m.tasks.length === 0 && m.overdue.length === 0;

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={href(addDays(today.date, -1))} aria-label="Previous day" className="rounded-control border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg">
            <span aria-hidden="true">‹</span>
          </Link>
          <h2 className="text-lg font-bold text-text">{formatDateLong(today.date, tz)}</h2>
          <Link href={href(addDays(today.date, 1))} aria-label="Next day" className="rounded-control border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg">
            <span aria-hidden="true">›</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-text">
            <span className="sr-only sm:not-sr-only">Go to date</span>
            <input
              type="date"
              value={today.date}
              onChange={(e) => e.target.value && router.push(href(e.target.value))}
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
            />
          </label>
          <Button onClick={() => setEditing("new")}>Add task</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-gap sm:grid-cols-3">
        <Tile label="Planned study" value={formatMinutes(m.stats.plannedMin)} />
        <Tile label="Recorded study" value={formatMinutes(today.stats.recordedMin)} />
        <Tile label="Tasks completed" value={`${m.stats.completed}/${m.stats.total}`} />
      </div>

      <OverloadBanner overloaded={today.overloaded} />

      <div className="grid grid-cols-1 gap-gap lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <OverdueBanner count={m.overdue.length} />
          {m.overdue.length ? <Group title="Overdue">{m.overdue.map((t) => row(t, true))}</Group> : null}
          {empty ? (
            <div className="rounded-card border border-border bg-surface p-6 text-center">
              <p className="font-semibold text-text">No tasks today</p>
              <p className="mt-1 text-sm text-muted">Add a task or pick something from your backlog.</p>
              <div className="mt-4 flex justify-center gap-3">
                <Button onClick={() => setEditing("new")}>Add a task</Button>
                <Link href="/planner?view=backlog" className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text hover:bg-bg">
                  Open backlog
                </Link>
              </div>
            </div>
          ) : null}
          {todo.length ? <Group title="To do">{todo.map((t) => row(t))}</Group> : null}
          {done.length ? <Group title="Completed">{done.map((t) => row(t))}</Group> : null}
          {skipped.length ? <Group title="Skipped">{skipped.map((t) => row(t))}</Group> : null}
        </div>

        <aside className="flex flex-col gap-4">
          <section aria-labelledby="unsched-h" className="rounded-card border border-border bg-surface p-4">
            <h3 id="unsched-h" className="mb-3 font-bold text-text">
              Unscheduled tasks
            </h3>
            <BacklogPanel
              tasks={m.unscheduled}
              tz={tz}
              date={today.date}
              onSchedule={(t, iso) => void m.reschedule(t, iso)}
            />
            <Link href="/planner?view=backlog" className="mt-3 inline-block text-sm font-semibold text-primary underline">
              View all in backlog
            </Link>
          </section>
          <section aria-labelledby="ahead-h" className="rounded-card border border-border bg-surface p-4">
            <h3 id="ahead-h" className="font-bold text-text">
              Plan ahead
            </h3>
            <p className="mt-1 text-sm text-muted">Get a suggested plan for the week.</p>
            <Button className="mt-3" variant="secondary" disabled>
              Suggest weekly plan
            </Button>
            <p className="mt-2 text-xs text-muted">Arrives in Phase 3</p>
          </section>
        </aside>
      </div>

      {editing ? (
        <TaskDialog
          open
          task={editing === "new" ? undefined : editing}
          defaultDate={editing === "new" ? today.date : undefined}
          subjects={subjects}
          tz={tz}
          onClose={() => setEditing(null)}
          onSubmit={(fields) => (editing === "new" ? m.create(fields) : m.update(editing, fields))}
        />
      ) : null}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text">{value}</p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = `grp-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="mb-2 font-bold text-text">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}
