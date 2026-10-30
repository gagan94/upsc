import Link from "next/link";
import { PlannerTabs } from "@/components/planner/PlannerTabs";
import { isPlannerView, type PlannerViewId } from "@/lib/planner-views";
import { BacklogView } from "@/components/planner/BacklogView";
import { TodayView } from "@/components/planner/TodayView";
import { WeekView } from "@/components/planner/WeekView";
import { MonthView, monthBounds } from "@/components/planner/MonthView";
import { GoalsView } from "@/components/planner/GoalsView";
import { SectionError, loadOrNull } from "@/components/settings/SettingsPage";
import { serverApi } from "@/lib/server-api";
import { addDays, localDate, startOfWeek } from "@/lib/time";
import type {
  GoalsView as GoalsData,
  ProfileView,
  ProgressView,
  StudyPrefsView,
  SubjectSummary,
  TaskView,
  TodayView as TodayData,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const sp = await searchParams;
  const view: PlannerViewId = isPlannerView(sp.view) ? sp.view : "today";
  const date = sp.date && DATE_RE.test(sp.date) ? sp.date : undefined;

  type Data =
    | { kind: "today"; tz: string; today: TodayData; unscheduled: TaskView[]; subjects: SubjectSummary[] }
    | { kind: "backlog"; tz: string; unscheduled: TaskView[]; subjects: SubjectSummary[] }
    | { kind: "week"; tz: string; today: string; weekStart: string; tasks: TaskView[]; subjects: SubjectSummary[] }
    | { kind: "month"; tz: string; today: string; year: number; month: number; weekStart: "monday" | "sunday"; tasks: TaskView[] }
    | { kind: "goals"; tz: string; goals: GoalsData; progress: ProgressView; subjects: SubjectSummary[] };

  const data = await loadOrNull<Data>(async () => {
    // The user's zone (not the browser's) decides what "today" is.
    const profile = await serverApi<ProfileView>("/me/profile");
    const tz = profile.timezone;
    if (view === "today") {
      const [today, unscheduled, subjects] = await Promise.all([
        serverApi<TodayData>(`/planner/today${date ? `?date=${date}` : ""}`),
        serverApi<{ tasks: TaskView[] }>("/planner/unscheduled"),
        serverApi<{ subjects: SubjectSummary[] }>("/learn/subjects"),
      ]);
      return { kind: "today", tz, today, unscheduled: unscheduled.tasks, subjects: subjects.subjects };
    }
    if (view === "backlog") {
      const [unscheduled, subjects] = await Promise.all([
        serverApi<{ tasks: TaskView[] }>("/planner/unscheduled"),
        serverApi<{ subjects: SubjectSummary[] }>("/learn/subjects"),
      ]);
      return { kind: "backlog", tz, unscheduled: unscheduled.tasks, subjects: subjects.subjects };
    }
    // Days are the user's days in their zone, never the browser's.
    const todayDate = localDate(new Date(), tz);
    const anchor = date ?? todayDate;
    if (view === "week") {
      const prefs = await serverApi<StudyPrefsView>("/me/study-preferences");
      const weekStart = startOfWeek(anchor, prefs.weekStart);
      const [range, subjects] = await Promise.all([
        serverApi<{ tasks: TaskView[] }>(`/planner/range?from=${weekStart}&to=${addDays(weekStart, 6)}`),
        serverApi<{ subjects: SubjectSummary[] }>("/learn/subjects"),
      ]);
      return { kind: "week", tz, today: todayDate, weekStart, tasks: range.tasks, subjects: subjects.subjects };
    }
    if (view === "month") {
      const prefs = await serverApi<StudyPrefsView>("/me/study-preferences");
      const year = Number(anchor.slice(0, 4));
      const month = Number(anchor.slice(5, 7));
      const { from, to } = monthBounds(year, month);
      const range = await serverApi<{ tasks: TaskView[] }>(`/planner/range?from=${from}&to=${to}`);
      return { kind: "month", tz, today: todayDate, year, month, weekStart: prefs.weekStart, tasks: range.tasks };
    }
    const prefs = await serverApi<StudyPrefsView>("/me/study-preferences");
    const [goals, progress, subjects] = await Promise.all([
      serverApi<{ goals: GoalsData }>("/planner/goals"),
      serverApi<ProgressView>(`/planner/progress?week=${startOfWeek(anchor, prefs.weekStart)}`),
      serverApi<{ subjects: SubjectSummary[] }>("/learn/subjects"),
    ]);
    return { kind: "goals", tz, goals: goals.goals, progress, subjects: subjects.subjects };
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text">Planner</h1>
        <p className="mt-1 text-sm text-muted">
          Plan your study days and track what you finish.{" "}
          <Link href="/planner/sessions" className="font-semibold text-primary hover:underline">
            Study session history
          </Link>
        </p>
      </div>
      <PlannerTabs view={view}>
        {data === null ? (
          <SectionError href={`/planner?view=${view}`} />
        ) : data.kind === "today" ? (
          <TodayView key={data.today.date} today={data.today} unscheduled={data.unscheduled} subjects={data.subjects} tz={data.tz} />
        ) : data.kind === "backlog" ? (
          <BacklogView unscheduled={data.unscheduled} subjects={data.subjects} tz={data.tz} date={localDate(new Date(), data.tz)} />
        ) : data.kind === "week" ? (
          <WeekView key={data.weekStart} weekStart={data.weekStart} tasks={data.tasks} subjects={data.subjects} tz={data.tz} today={data.today} />
        ) : data.kind === "month" ? (
          <MonthView year={data.year} month={data.month} weekStart={data.weekStart} tasks={data.tasks} tz={data.tz} today={data.today} />
        ) : (
          <GoalsView key={data.progress.weekStart} goals={data.goals} progress={data.progress} subjects={data.subjects} />
        )}
      </PlannerTabs>
    </div>
  );
}
