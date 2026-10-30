import Link from "next/link";
import { redirect } from "next/navigation";
import { ErrorPanel } from "@/components/ErrorPanel";
import { ReviewPanel } from "@/components/practice/ReviewPanel";
import { Banner } from "@/components/ui/Banner";
import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import type { PracticeResults, QuestionReview } from "@/lib/types";

export const dynamic = "force-dynamic";

async function settle<T>(p: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  try {
    return { ok: true, value: await p };
  } catch (error) {
    return { ok: false, error };
  }
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string; ordinal: string }> }) {
  const { id, ordinal } = await params;
  if (!/^[1-9]\d{0,2}$/.test(ordinal)) return <ErrorPanel embedded title="We couldn't find this question" />;
  const sid = encodeURIComponent(id);
  const [rev, res] = await Promise.all([
    settle(serverApi<QuestionReview>(`/practice/sessions/${sid}/questions/${ordinal}/review`)),
    settle(serverApi<PracticeResults>(`/practice/sessions/${sid}/results`)),
  ]);
  for (const r of [rev, res]) {
    if (!r.ok && !(r.error instanceof ApiError)) throw r.error;
  }
  const status = !rev.ok ? (rev.error as ApiError).status : !res.ok ? (res.error as ApiError).status : 0;
  if (status === 401) redirect("/login");
  if (!rev.ok && status === 409) {
    return (
      <div className="flex flex-col gap-3">
        <Banner tone="warning">{(rev.error as ApiError).message}</Banner>
        <Link href={`/prelims/session/${sid}`} className="font-semibold text-primary hover:underline">Back to your practice set</Link>
      </div>
    );
  }
  if (!rev.ok || !res.ok) return <ErrorPanel embedded title={status === 404 ? "We couldn't find this question" : "We couldn't load this review"} />;
  const n = Number(ordinal);
  const q = res.value.questions.find((x) => x.ordinal === n);
  if (!q) return <ErrorPanel embedded title="We couldn't find this question" />;
  return <ReviewPanel sessionId={id} questionId={q.questionId} ordinal={n} total={res.value.questions.length} review={rev.value} />;
}
