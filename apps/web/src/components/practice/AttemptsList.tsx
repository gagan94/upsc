"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import type { AttemptSummary, AttemptsPage } from "@/lib/types";
import { ATTEMPTS_PAGE_SIZE as PAGE } from "@/lib/attempts";

export function attemptDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function AttemptRow({ a, tz }: { a: AttemptSummary; tz: string }) {
  return (
    <li className="flex flex-col gap-1 px-4 py-3">
      <p className="text-sm font-semibold text-text">{a.title}</p>
      <p className="flex flex-wrap gap-x-3 text-xs text-muted">
        <span>{attemptDate(a.submittedAt, tz)}</span>
        <span>{a.mode === "test" ? "Test" : "Learning"}{a.kind === "retry" ? " · Retry" : ""}</span>
        <span>{a.correct} of {a.total} correct</span>
        <span>Accuracy {Math.round(a.accuracy * 100)}%</span>
        {a.score !== null ? <span>Score {a.score}</span> : null}
      </p>
    </li>
  );
}

export function AttemptsList({ initial, tz }: { initial: AttemptsPage; tz: string }) {
  const [attempts, setAttempts] = useState(initial.attempts);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function more() {
    if (!cursor) return;
    setLoading(true);
    setFailed(false);
    try {
      const page = await apiFetch<AttemptsPage>(`/practice/attempts?limit=${PAGE}&cursor=${cursor}`);
      setAttempts((cur) => [...cur, ...page.attempts]);
      setCursor(page.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (attempts.length === 0) return <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted">No attempts yet. Finish a practice set and it will be listed here.</p>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {attempts.map((a) => <AttemptRow key={a.id} a={a} tz={tz} />)}
      </ul>
      {failed ? <Banner tone="error">We couldn&apos;t load more attempts. Please try again.</Banner> : null}
      {cursor ? <Button variant="secondary" className="self-start" loading={loading} onClick={more}>Load more</Button> : null}
    </div>
  );
}
