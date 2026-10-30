import Link from "next/link";
import { QuestionsTable } from "@/components/admin/QuestionsTable";
import { serverApi } from "@/lib/server-api";
import type { PracticeSubject, QuestionAdminPage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const [data, subjects] = await Promise.all([
    serverApi<QuestionAdminPage>("/admin/questions?status=all&limit=25"),
    // Best effort: only subjects that already have published questions are listed here.
    serverApi<{ subjects: PracticeSubject[] }>("/practice/subjects").then((r) => r.subjects, () => [] as PracticeSubject[]),
  ]);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Questions</h1>
        <div className="flex gap-3 text-sm font-semibold">
          <Link href="/admin/questions/new" className="rounded-control bg-primary px-4 py-2 text-primary-text">
            New question
          </Link>
          <Link href="/admin/questions/import" className="rounded-control border border-border bg-surface px-4 py-2">
            Import
          </Link>
          <Link href="/admin/question-reports" className="rounded-control border border-border bg-surface px-4 py-2">
            Reports
          </Link>
        </div>
      </div>
      <QuestionsTable initial={data} subjects={subjects} />
    </div>
  );
}
