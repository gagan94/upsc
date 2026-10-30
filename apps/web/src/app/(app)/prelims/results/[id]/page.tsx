import { redirect } from "next/navigation";
import { ErrorPanel } from "@/components/ErrorPanel";
import { ResultsSummary } from "@/components/practice/ResultsSummary";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { PracticeResults } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: PracticeResults | null = null;
  let status = 0;
  try {
    data = await serverApi<PracticeResults>(`/practice/sessions/${encodeURIComponent(id)}/results`);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    status = e.status;
    if (status === 409 && e.code === "not_submitted") redirect(`/prelims/session/${encodeURIComponent(id)}`);
  }
  if (status === 401) redirect("/login");
  if (!data) return <ErrorPanel embedded title={status === 404 ? "We couldn't find this practice set" : "We couldn't load these results"} />;
  return <ResultsSummary sessionId={id} data={data} />;
}
