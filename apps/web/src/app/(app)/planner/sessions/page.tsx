import Link from "next/link";
import { ActiveSessionPanel } from "@/components/study/ActiveSessionPanel";
import { SessionHistory } from "@/components/study/SessionHistory";
import { SectionError, loadOrNull } from "@/components/settings/SettingsPage";
import { serverApi } from "@/lib/server-api";
import type { EndedStudySessionView, ProfileView, SubjectSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const data = await loadOrNull(async () => {
    const [profile, sessions, subjects] = await Promise.all([
      serverApi<ProfileView>("/me/profile"),
      serverApi<{ sessions: EndedStudySessionView[] }>("/study-sessions?limit=50"),
      serverApi<{ subjects: SubjectSummary[] }>("/learn/subjects"),
    ]);
    return { tz: profile.timezone, sessions: sessions.sessions, subjects: subjects.subjects };
  });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/planner" className="text-sm font-semibold text-primary hover:underline">
          <span aria-hidden="true">‹ </span>Planner
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-text">Study sessions</h1>
        <p className="mt-1 text-sm text-muted">Your recorded study time, newest first.</p>
      </div>
      <ActiveSessionPanel />
      {data === null ? (
        <SectionError href="/planner/sessions" />
      ) : (
        <SessionHistory sessions={data.sessions} subjects={data.subjects} tz={data.tz} />
      )}
    </div>
  );
}
