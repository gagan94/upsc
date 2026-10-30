import Link from "next/link";
import { QuestionsTable } from "@/components/admin/QuestionsTable";
import { loadNodes } from "@/lib/admin-nodes";
import { serverApi } from "@/lib/server-api";
import type { QuestionAdminPage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const [data, nodes] = await Promise.all([serverApi<QuestionAdminPage>("/admin/questions?status=all&limit=25"), loadNodes()]);
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
      <QuestionsTable initial={data} nodes={nodes} />
    </div>
  );
}
