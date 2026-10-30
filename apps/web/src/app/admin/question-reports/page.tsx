import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { serverApi } from "@/lib/server-api";
import type { AdminQuestionReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuestionReportsPage() {
  const { reports } = await serverApi<{ reports: AdminQuestionReport[] }>("/admin/question-reports?limit=50");
  return (
    <div>
      <h1 className="text-2xl font-bold">Question reports</h1>
      <p className="mt-1 text-sm text-muted">Open issue reports from learners, newest first.</p>
      <ReportsPanel reports={reports} />
    </div>
  );
}
