import { PlannerTabs, PLANNER_VIEWS, type PlannerViewId } from "@/components/planner/PlannerTabs";
import { BacklogView } from "@/components/planner/BacklogView";
import { TodayView } from "@/components/planner/TodayView";
import { SectionError, loadOrNull } from "@/components/settings/SettingsPage";
import { serverApi } from "@/lib/server-api";
import { localDate } from "@/lib/time";
import type { ProfileView, SubjectSummary, TaskView, TodayView as TodayData } from "@/lib/types";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const sp = await searchParams;
  const view: PlannerViewId = (PLANNER_VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as PlannerViewId) : "today";
  const date = sp.date && DATE_RE.test(sp.date) ? sp.date : undefined;

  const data = await loadOrNull(async () => {
    // The user's zone (not the browser's) decides what "today" is.
    const profile = await serverApi<ProfileView>("/me/profile");
    const tz = profile.timezone;
    if (view === "today") {
      const [today, unscheduled, subjects] = await Promise.all([
        serverApi<TodayData>(`/planner/today${date ? `?date=${date}` : ""}`),
        serverApi<{ tasks: TaskView[] }>("/planner/unscheduled"),
        serverApi<{ subjects: SubjectSummary[] }>("/learn/subjects"),
      ]);
      return { tz, today, unscheduled: unscheduled.tasks, subjects: subjects.subjects };
    }
    if (view === "backlog") {
      const [unscheduled, subjects] = await Promise.all([
        serverApi<{ tasks: TaskView[] }>("/planner/unscheduled"),
        serverApi<{ subjects: SubjectSummary[] }>("/learn/subjects"),
      ]);
      return { tz, today: null, unscheduled: unscheduled.tasks, subjects: subjects.subjects };
    }
    return { tz, today: null, unscheduled: [] as TaskView[], subjects: [] as SubjectSummary[] };
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text">Planner</h1>
        <p className="mt-1 text-sm text-muted">Plan your study days and track what you finish.</p>
      </div>
      <PlannerTabs view={view}>
        {data === null ? (
          <SectionError href={`/planner?view=${view}`} />
        ) : view === "today" && data.today ? (
          <TodayView
            key={data.today.date}
            today={data.today}
            unscheduled={data.unscheduled}
            subjects={data.subjects}
            tz={data.tz}
          />
        ) : view === "backlog" ? (
          <BacklogView
            unscheduled={data.unscheduled}
            subjects={data.subjects}
            tz={data.tz}
            date={localDate(new Date(), data.tz)}
          />
        ) : (
          <div className="rounded-card border border-border bg-surface p-6 text-center">
            <p className="font-semibold text-text">Coming in the next step</p>
            <p className="mt-1 text-sm text-muted">This view is not available yet.</p>
          </div>
        )}
      </PlannerTabs>
    </div>
  );
}
