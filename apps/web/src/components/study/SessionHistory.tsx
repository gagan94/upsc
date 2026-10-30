import { formatMinutes } from "@/lib/format";
import { formatDayShort, formatTimeLabel } from "@/lib/planner-time";
import type { EndedStudySessionView } from "@/lib/types";

/** Ended sessions, newest first: date, duration, subject, focus rating. */
export function SessionHistory({
  sessions,
  subjects,
  tz,
}: {
  sessions: EndedStudySessionView[];
  /** Subjects from GET /learn/subjects; sessions reference them by `syllabusNodeId`. */
  subjects: { syllabusNodeId: string; title: string }[];
  tz: string;
}) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface p-6 text-center">
        <p className="font-semibold text-text">No study sessions yet</p>
        <p className="mt-1 text-sm text-muted">Start a session from the top bar or from a task, and it will show up here.</p>
      </div>
    );
  }
  const title = (id: string | null) => (id ? (subjects.find((s) => s.syllabusNodeId === id)?.title ?? "—") : "—");
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[420px] text-left text-sm">
        <caption className="sr-only">Study session history</caption>
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Date</th>
            <th scope="col" className="px-3 py-2 font-semibold">Duration</th>
            <th scope="col" className="px-3 py-2 font-semibold">Subject</th>
            <th scope="col" className="px-3 py-2 font-semibold">Focus</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-text">
                {formatDayShort(s.startedAt, tz)}, {formatTimeLabel(s.startedAt, tz)}
              </td>
              <td className="px-3 py-2 text-text">
                {formatMinutes(Math.round(s.activeSeconds / 60))}
                <span className="text-xs text-muted"> of {s.plannedMin} min</span>
              </td>
              <td className="px-3 py-2 text-text">{title(s.subjectNodeId)}</td>
              <td className="px-3 py-2 text-text">
                {s.focusRating ? <span aria-label={`Focus ${s.focusRating} out of 5`}>{s.focusRating}/5</span> : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
