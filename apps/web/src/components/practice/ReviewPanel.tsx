"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDuration } from "@/lib/format";
import type { Confidence, OptionKey, QuestionReview } from "@/lib/types";
import { BookmarkButton } from "./BookmarkButton";
import { answerStatus } from "./QuestionReviewList";
import { OthersAnswered } from "./OthersAnswered";
import { ReasoningBox } from "./ReasoningBox";
import { ReportIssueDialog } from "./ReportIssueDialog";

const KEYS: OptionKey[] = ["A", "B", "C", "D"];
const CONFIDENCE: Record<Confidence, string> = { guess: "Guess", fairly: "Fairly sure", sure: "Sure" };

export function ReviewPanel({
  sessionId,
  questionId,
  ordinal,
  total,
  review,
}: {
  sessionId: string;
  questionId: string;
  ordinal: number;
  total: number;
  review: QuestionReview;
}) {
  const [reporting, setReporting] = useState(false);
  const { question: q } = review;
  const base = `/prelims/review/${encodeURIComponent(sessionId)}`;
  const status = answerStatus(review.yourAnswer, review.correct);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href={`/prelims/results/${encodeURIComponent(sessionId)}`} className="text-sm font-semibold text-primary hover:underline">Back to results</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-text">Question {ordinal} of {total}</h1>
          {q.isSample ? <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-xs font-semibold text-muted">Sample question</span> : null}
        </div>
        <p className="mt-1 text-sm text-muted">
          {q.topic ? `${q.topic} · ` : ""}
          {q.difficulty[0].toUpperCase() + q.difficulty.slice(1)}
        </p>
      </div>

      <section aria-label="Question" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
        <p className="whitespace-pre-wrap text-base text-text">{q.stem}</p>
        {q.statements ? (
          <ol className="list-decimal pl-5 text-sm text-text">
            {q.statements.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        ) : null}
        <ul className="flex flex-col gap-1 text-sm text-text">
          {q.options.map((o) => (
            <li key={o.key}>
              <span className="font-semibold">{o.key}.</span> {o.text}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Your result" className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 text-sm text-text">
        <p className="font-semibold">
          <span aria-hidden="true">{status.icon} </span>
          {status.text}
        </p>
        <p>Your answer: {review.yourAnswer ?? "Skipped"}</p>
        <p>Correct answer: {review.correctOption}</p>
        <p>Confidence: {review.confidence ? CONFIDENCE[review.confidence] : "Not set"}</p>
        <p>Time spent: {review.yourAnswer === null && review.timeMs === 0 ? "—" : formatDuration(review.timeMs / 1000)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <BookmarkButton questionId={questionId} initial={review.bookmarked} />
          <button
            type="button"
            onClick={() => setReporting(true)}
            className="self-start rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Report an issue
          </button>
        </div>
      </section>

      <section aria-labelledby="why-h" className="flex flex-col gap-2">
        <h2 id="why-h" className="text-base font-bold text-text">Why {review.correctOption} is correct</h2>
        <p className="whitespace-pre-wrap text-sm text-text">{review.explanation}</p>
      </section>

      <section aria-labelledby="opt-h" className="flex flex-col gap-2">
        <h2 id="opt-h" className="text-base font-bold text-text">Each option</h2>
        <ul aria-label="Option-by-option reasoning" className="flex flex-col gap-1 text-sm text-text">
          {KEYS.map((k) => (
            <li key={k}>
              <span className="font-semibold">{k}.</span> {review.optionReasoning[k]}
            </li>
          ))}
        </ul>
      </section>

      {review.misconception ? (
        <section aria-labelledby="mis-h" className="flex flex-col gap-2">
          <h2 id="mis-h" className="text-base font-bold text-text">Why {review.misconception.option} can feel convincing</h2>
          <p className="whitespace-pre-wrap text-sm text-text">{review.misconception.text}</p>
        </section>
      ) : null}

      <OthersAnswered data={review.othersAnswered} />
      <ReasoningBox sessionId={sessionId} ordinal={ordinal} initial={review.reasoningText} />

      <nav aria-label="Question navigation" className="flex items-center justify-between gap-3">
        {ordinal > 1 ? <Link href={`${base}/${ordinal - 1}`} className="font-semibold text-primary hover:underline">Previous question</Link> : <span />}
        {ordinal < total ? <Link href={`${base}/${ordinal + 1}`} className="font-semibold text-primary hover:underline">Next question</Link> : <span />}
      </nav>

      <ReportIssueDialog questionId={questionId} open={reporting} onClose={() => setReporting(false)} />
    </div>
  );
}
