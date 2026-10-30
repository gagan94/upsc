"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/format";
import type { PracticeResults, PracticeSessionDetail } from "@/lib/types";
import { QuestionReviewList } from "./QuestionReviewList";

const scoreFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const formatScore = (n: number) => scoreFmt.format(n).replace("-", "−");
const pct = (fraction: number) => `${Math.round((Number.isFinite(fraction) ? fraction : 0) * 100)}%`;
const linkBtn = "inline-flex items-center justify-center rounded-control px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="rounded-card border border-border bg-surface p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="mt-1 text-xl font-bold text-text">{children}</div>
    </div>
  );
}

export function ResultsSummary({ sessionId, data }: { sessionId: string; data: PracticeResults }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstWrong = data.questions.find((q) => q.correct === false) ?? data.questions[0];
  const next = data.nextAction;

  async function retry() {
    setRetrying(true);
    setError(null);
    try {
      const created = await apiFetch<PracticeSessionDetail>(`/practice/sessions/${encodeURIComponent(sessionId)}/retry`, { method: "POST" });
      router.push(`/prelims/session/${encodeURIComponent(created.session.id)}`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't start a retry. Please try again.");
      setRetrying(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/prelims" className="text-sm font-semibold text-primary hover:underline">Back to Prelims</Link>
        <h1 className="mt-2 text-2xl font-bold text-text">Results</h1>
        <p className="mt-1 text-sm text-muted">
          {data.session.mode === "test" ? "Test" : "Learning"} mode · {data.session.total} questions
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile label="Score">
          {data.score === null ? <span className="text-sm font-semibold text-muted">Accuracy only in learning mode</span> : formatScore(data.score)}
        </Tile>
        <Tile label="Accuracy">{pct(data.accuracy)}</Tile>
        <Tile label="Correct">{data.correct}</Tile>
        <Tile label="Incorrect">{data.incorrect}</Tile>
        <Tile label="Skipped">{data.skipped}</Tile>
        <Tile label="Time taken">{formatDuration(data.session.timeTakenSeconds)}</Tile>
      </div>

      <section aria-labelledby="topics-h" className="flex flex-col gap-3">
        <h2 id="topics-h" className="text-lg font-bold text-text">By topic</h2>
        {data.byTopic.length === 0 ? (
          <p className="text-sm text-muted">No topic breakdown for this set.</p>
        ) : (
          <ul className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
            {data.byTopic.map((t) => {
              const width = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
              return (
                <li key={t.subjectNodeId} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold text-text">{t.title}</span>
                    <span className="text-muted">{t.correct} of {t.total} correct</span>
                  </div>
                  <span className="h-2.5 overflow-hidden rounded-full bg-bg">
                    <span data-testid={`topic-bar-${t.subjectNodeId}`} className="block h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Next study action" className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-lg font-bold text-text">Next study action</h2>
        <div className="mt-2 text-sm">
          {next.kind === "practise_weak_topic" && next.subjectNodeId ? (
            <Link href={`/prelims/new?subject=${encodeURIComponent(next.subjectNodeId)}`} className="font-semibold text-primary hover:underline">{next.label}</Link>
          ) : next.kind === "review_mistakes" ? (
            <Link href="/prelims?tab=mistakes" className="font-semibold text-primary hover:underline">{next.label}</Link>
          ) : (
            <p className="flex flex-wrap gap-x-2 text-muted"><span className="font-semibold text-text">{next.label}</span><span>Arrives in Phase 4</span></p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-3">
        {firstWrong ? (
          <Link href={`/prelims/review/${encodeURIComponent(sessionId)}/${firstWrong.ordinal}`} className={`${linkBtn} bg-primary text-primary-text hover:opacity-90`}>Review answers</Link>
        ) : null}
        <Link href="/prelims?tab=mistakes" className={`${linkBtn} border border-border bg-surface text-text hover:bg-bg`}>Mistake notebook</Link>
        <Button variant="secondary" loading={retrying} onClick={retry}>Retry as practice</Button>
        <div className="flex flex-col">
          <Button variant="secondary" disabled aria-describedby="progress-note">See progress</Button>
          <span id="progress-note" className="mt-1 text-xs text-muted">Arrives in Phase 4</span>
        </div>
      </div>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <QuestionReviewList sessionId={sessionId} questions={data.questions} />
    </div>
  );
}
