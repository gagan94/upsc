"use client";

import Link from "next/link";
import { useState } from "react";
import { Chips } from "@/components/ui/Chips";
import type { PracticeResults } from "@/lib/types";

type Q = PracticeResults["questions"][number];
type Filter = "all" | "incorrect" | "bookmarked" | "skipped";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "incorrect", label: "Incorrect" },
  { value: "bookmarked", label: "Bookmarked" },
  { value: "skipped", label: "Skipped" },
];

export function answerStatus(selected: string | null, correct: boolean | null): { icon: string; text: string } {
  if (selected === null) return { icon: "–", text: "Skipped" };
  if (correct === true) return { icon: "✓", text: "Correct" };
  if (correct === false) return { icon: "✗", text: "Incorrect" };
  return { icon: "•", text: "Answered" };
}

export const statusOf = (q: Q) => answerStatus(q.selected, q.correct);

const keep: Record<Filter, (q: Q) => boolean> = {
  all: () => true,
  incorrect: (q) => q.correct === false,
  bookmarked: (q) => q.bookmarked,
  skipped: (q) => q.selected === null,
};

export function QuestionReviewList({ sessionId, questions }: { sessionId: string; questions: Q[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = questions.filter(keep[filter]);
  return (
    <section aria-labelledby="qlist-h" className="flex flex-col gap-3">
      <h2 id="qlist-h" className="text-lg font-bold text-text">Questions</h2>
      <Chips label="Filter questions" options={FILTERS} value={filter} onChange={(v) => setFilter(v as Filter)} />
      {shown.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted">No questions match this filter.</p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {shown.map((q) => {
            const s = statusOf(q);
            return (
              <li key={q.ordinal}>
                <Link
                  href={`/prelims/review/${encodeURIComponent(sessionId)}/${q.ordinal}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-bg focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="font-semibold text-text">Question {q.ordinal}</span>
                  <span className="flex items-center gap-3 text-muted">
                    {q.bookmarked ? <span>Bookmarked</span> : null}
                    <span className="font-semibold text-text">
                      <span aria-hidden="true">{s.icon} </span>
                      {s.text}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
