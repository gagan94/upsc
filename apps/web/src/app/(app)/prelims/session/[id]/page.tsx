import { redirect } from "next/navigation";
import { ErrorPanel } from "@/components/ErrorPanel";
import { shortSetSentence } from "@/components/practice/short-set-note";
import { Workspace } from "@/components/practice/Workspace";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { PracticeSessionDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ note?: string; q?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  let data: PracticeSessionDetail | null = null;
  let status = 0;
  try {
    data = await serverApi<PracticeSessionDetail>(`/practice/sessions/${encodeURIComponent(id)}`);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    status = e.status;
  }
  if (status === 401) redirect("/login");
  if (data && data.session.status !== "in_progress") redirect(`/prelims/results/${encodeURIComponent(data.session.id)}`);
  if (!data) return <ErrorPanel embedded title={status === 404 ? "We couldn't find this practice set" : "We couldn't load this practice set"} />;
  const q = /^\d{1,3}$/.test(sp.q ?? "") ? Number(sp.q) : undefined;
  return <Workspace initial={data} note={shortSetSentence(sp.note)} initialOrdinal={q} />;
}
