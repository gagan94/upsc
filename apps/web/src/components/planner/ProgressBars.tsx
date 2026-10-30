import { ProgressBar } from "@/components/home/ProgressBar";
import { formatMinutes } from "@/lib/format";
import type { ProgressView } from "@/lib/types";

/** Rounded percentage of `value` against `goal`; may exceed 100 (callers cap the bar, not the text). */
export function percentOf(value: number, goal: number): number {
  if (!(goal > 0) || !(value > 0)) return 0;
  return Math.round((value / goal) * 100);
}
const cap = (p: number) => Math.min(100, p);

/** A bar capped at 100% whose accessible value never exceeds 100 either. */
function Bar({ label, percent }: { label: string; percent: number }) {
  return <ProgressBar label={label} percent={cap(percent)} />;
}

export function ProgressBars({ progress }: { progress: ProgressView }) {
  const { totals, subjects } = progress;
  const study = percentOf(totals.recordedMin, totals.goalMin);
  const tasks = percentOf(totals.tasksDone, totals.tasksTotal);
  return (
    <section aria-labelledby="progress-h" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <h3 id="progress-h" className="font-bold text-text">
        This week
      </h3>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold text-text">Study time</span>
          <span className="text-muted">{`${formatMinutes(totals.recordedMin)} of ${formatMinutes(totals.goalMin)} (${study}%)`}</span>
        </div>
        <Bar label="Study time this week" percent={study} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold text-text">Tasks done</span>
          <span className="text-muted">{`${totals.tasksDone} of ${totals.tasksTotal} tasks (${tasks}%)`}</span>
        </div>
        <Bar label="Tasks done this week" percent={tasks} />
      </div>
      <p className="text-xs text-muted">Recorded work only: skipped tasks and unrecorded timer sessions do not add study time</p>

      {subjects.length ? (
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-bold text-text">By subject</h4>
          <ul className="flex flex-col gap-3">
            {subjects.map((s) => {
              const pct = s.targetMin !== null ? percentOf(s.recordedMin, s.targetMin) : null;
              return (
                <li key={s.subjectNodeId} className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-text">{s.title || "Subject"}</span>
                  {pct !== null ? <Bar label={`${s.title || "Subject"} weekly target`} percent={pct} /> : null}
                  <span className="text-xs text-muted">
                    {`Planned ${formatMinutes(s.plannedMin)} · Recorded ${formatMinutes(s.recordedMin)} · ${
                      s.targetMin !== null ? `Target ${formatMinutes(s.targetMin)} (${pct}%)` : "No target"
                    }`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
