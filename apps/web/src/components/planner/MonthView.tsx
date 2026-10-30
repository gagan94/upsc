import Link from "next/link";
import { formatMinutes } from "@/lib/format";
import { groupByDay, loadLevel, plannedMinutes, type LoadLevel } from "@/lib/planner-days";
import { addDays } from "@/lib/time";
import type { TaskView } from "@/lib/types";
import { monthGrid } from "@/lib/week";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOTS: Record<LoadLevel, number> = { none: 0, light: 1, medium: 2, heavy: 3 };
const LOAD_TEXT: Record<LoadLevel, string> = { none: "", light: "light load", medium: "medium load", heavy: "heavy load" };

const monthHref = (year: number, month: number) => `/planner?view=month&date=${year}-${String(month).padStart(2, "0")}-01`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Month grid; each day shows a load indicator and task count and opens Today for that date. */
export function MonthView({
  year,
  month,
  weekStart,
  tasks,
  tz,
  today,
}: {
  year: number;
  /** 1-based. */
  month: number;
  weekStart: "monday" | "sunday";
  tasks: TaskView[];
  tz: string;
  today: string;
}) {
  const rows = monthGrid(year, month, weekStart);
  const byDay = groupByDay(tasks, tz);
  const heads = weekStart === "monday" ? WEEKDAYS_MON : ["Sun", ...WEEKDAYS_MON.slice(0, 6)];
  const prev = month === 1 ? [year - 1, 12] : [year, month - 1];
  const next = month === 12 ? [year + 1, 1] : [year, month + 1];
  const link = "rounded-control border border-border px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href={monthHref(prev[0], prev[1])} aria-label="Previous month" className={link}>
          <span aria-hidden="true">‹</span>
        </Link>
        <h2 className="text-lg font-bold text-text">
          {MONTHS[month - 1]} {year}
        </h2>
        <Link href={monthHref(next[0], next[1])} aria-label="Next month" className={link}>
          <span aria-hidden="true">›</span>
        </Link>
      </div>
      <div role="table" aria-label={`${MONTHS[month - 1]} ${year}`} className="grid grid-cols-7 gap-1">
        <div role="row" className="contents">
          {heads.map((h) => (
            <div key={h} role="columnheader" className="px-1 text-center text-xs font-semibold uppercase text-muted">
              {h}
            </div>
          ))}
        </div>
        {rows.map((row, i) => (
          <div key={i} role="row" className="contents">
            {row.map((d, j) => {
              if (!d) return <div key={j} role="cell" aria-hidden="true" />;
              const list = byDay.get(d) ?? [];
              const planned = plannedMinutes(list);
              const level = loadLevel(planned);
              const day = Number(d.slice(8));
              const isToday = d === today;
              const name = [
                `${day} ${MONTHS[month - 1]}`,
                list.length ? `${plural(list.length, "task")}, ${formatMinutes(planned)} planned${LOAD_TEXT[level] ? `, ${LOAD_TEXT[level]}` : ""}` : "No tasks",
              ].join(", ");
              return (
                <div key={j} role="cell">
                  <Link
                    href={`/planner?view=today&date=${d}`}
                    aria-label={name}
                    aria-current={isToday ? "date" : undefined}
                    data-load={level}
                    className={`flex min-h-16 flex-col justify-between rounded-control border p-1.5 text-text hover:bg-bg focus-visible:outline-2 focus-visible:outline-primary ${isToday ? "border-primary bg-surface ring-1 ring-primary" : "border-border bg-surface"}`}
                  >
                    <span className="text-sm font-semibold">{day}</span>
                    <span className="flex flex-wrap items-center gap-1">
                      <span aria-hidden="true" className="flex gap-0.5">
                        {Array.from({ length: DOTS[level] }, (_, k) => (
                          <span key={k} className="h-1.5 w-1.5 rounded-full bg-primary" />
                        ))}
                      </span>
                      {list.length ? <span className="text-[11px] text-muted">{plural(list.length, "task")}</span> : null}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">Dots show planned load: 1 under 2h, 2 under 4h, 3 for 4h or more.</p>
    </div>
  );
}

/** First and last day (YYYY-MM-DD) of a month. */
export function monthBounds(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, "0");
  const from = `${year}-${mm}-01`;
  const nextFirst = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { from, to: addDays(nextFirst, -1) };
}
