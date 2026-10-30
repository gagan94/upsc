import { AttemptsList, ATTEMPTS_PAGE_SIZE } from "@/components/practice/AttemptsList";
import { BookmarksList } from "@/components/practice/BookmarksList";
import { HUB_TABS, HubTabs, type HubTabId } from "@/components/practice/HubTabs";
import { MistakesList } from "@/components/practice/MistakesList";
import { PyqPanel } from "@/components/practice/PyqPanel";
import { RecentSets } from "@/components/practice/RecentSets";
import { SectionError, loadOrNull } from "@/components/settings/SettingsPage";
import { serverApi } from "@/lib/server-api";
import type { AttemptsPage, BookmarksResponse, MistakesResponse, PracticeSubject, ProfileView } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Data =
  | { kind: "practice"; tz: string; attempts: AttemptsPage }
  | { kind: "attempts"; tz: string; attempts: AttemptsPage }
  | { kind: "pyq"; subjects: PracticeSubject[] }
  | { kind: "bookmarks"; bookmarks: BookmarksResponse }
  | { kind: "mistakes"; subjects: PracticeSubject[]; mistakes: MistakesResponse; subject: string; includeResolved: boolean };

export default async function PrelimsPage({ searchParams }: { searchParams: Promise<{ tab?: string; subject?: string; resolved?: string }> }) {
  const sp = await searchParams;
  const tab: HubTabId = (HUB_TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as HubTabId) : "practice";
  const subject = sp.subject && UUID.test(sp.subject) ? sp.subject : "";
  const includeResolved = sp.resolved === "1";

  const data = await loadOrNull<Data>(async () => {
    if (tab === "practice" || tab === "attempts") {
      const [profile, attempts] = await Promise.all([
        serverApi<ProfileView>("/me/profile"),
        serverApi<AttemptsPage>(`/practice/attempts?limit=${tab === "practice" ? 5 : ATTEMPTS_PAGE_SIZE}`),
      ]);
      return { kind: tab, tz: profile.timezone, attempts };
    }
    if (tab === "pyq") {
      const { subjects } = await serverApi<{ subjects: PracticeSubject[] }>("/practice/subjects");
      return { kind: "pyq", subjects };
    }
    if (tab === "bookmarks") return { kind: "bookmarks", bookmarks: await serverApi<BookmarksResponse>("/practice/bookmarks") };
    const q = [subject ? `subject=${subject}` : "", includeResolved ? "includeResolved=true" : ""].filter(Boolean).join("&");
    const [subjects, mistakes] = await Promise.all([
      serverApi<{ subjects: PracticeSubject[] }>("/practice/subjects"),
      serverApi<MistakesResponse>(`/practice/mistakes${q ? `?${q}` : ""}`),
    ]);
    return { kind: "mistakes", subjects: subjects.subjects, mistakes, subject, includeResolved };
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text">Prelims</h1>
        <p className="mt-1 text-sm text-muted">Practise MCQs, review your mistakes and track your attempts. Sample questions: the current question bank is sample data, not past papers.</p>
      </div>
      <HubTabs tab={tab}>
        {data === null ? (
          <SectionError href={`/prelims?tab=${tab}`} />
        ) : data.kind === "practice" ? (
          <RecentSets attempts={data.attempts.attempts} tz={data.tz} />
        ) : data.kind === "attempts" ? (
          <AttemptsList key="attempts" initial={data.attempts} tz={data.tz} />
        ) : data.kind === "pyq" ? (
          <PyqPanel subjects={data.subjects} />
        ) : data.kind === "bookmarks" ? (
          <BookmarksList items={data.bookmarks.items} />
        ) : (
          <MistakesList items={data.mistakes.items} subjects={data.subjects} subject={data.subject} includeResolved={data.includeResolved} />
        )}
      </HubTabs>
    </div>
  );
}
