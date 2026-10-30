import { localDate } from "./time";
import type { TaskView } from "./types";

/** Tasks bucketed by their calendar day in the USER's zone (unscheduled tasks are dropped), ordered by start. */
export function groupByDay(tasks: TaskView[], tz: string): Map<string, TaskView[]> {
  const out = new Map<string, TaskView[]>();
  for (const t of tasks) {
    if (!t.scheduledStart) continue;
    const day = localDate(new Date(t.scheduledStart), tz);
    const list = out.get(day);
    if (list) list.push(t);
    else out.set(day, [t]);
  }
  for (const list of out.values()) list.sort((a, b) => a.scheduledStart!.localeCompare(b.scheduledStart!) || a.id.localeCompare(b.id));
  return out;
}

/** Minutes planned for a day: skipped tasks do not count. */
export function plannedMinutes(tasks: TaskView[]): number {
  return tasks.filter((t) => t.status !== "skipped").reduce((s, t) => s + (t.durationMin ?? 0), 0);
}

export type LoadLevel = "none" | "light" | "medium" | "heavy";
/** Load indicator thresholds on planned minutes: under 2h light, under 4h medium, otherwise heavy. */
export function loadLevel(plannedMin: number): LoadLevel {
  if (plannedMin <= 0) return "none";
  if (plannedMin < 120) return "light";
  if (plannedMin < 240) return "medium";
  return "heavy";
}
