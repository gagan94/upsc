"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

/** Optimistic bookmark toggle: flips at once, reverts (and says so) if the request fails. */
export function BookmarkButton({ questionId, initial }: { questionId: string; initial: boolean }) {
  const [marked, setMarked] = useState(initial);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const next = !marked;
    setMarked(next);
    setFailed(false);
    try {
      await apiFetch(`/practice/questions/${encodeURIComponent(questionId)}/bookmark`, { method: next ? "PUT" : "DELETE" });
    } catch {
      setMarked(!next);
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        aria-pressed={marked}
        aria-label={marked ? "Remove bookmark" : "Bookmark question"}
        onClick={toggle}
        className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-text hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true">{marked ? "★ " : "☆ "}</span>
        {marked ? "Bookmarked" : "Bookmark"}
      </button>
      {failed ? <p role="alert" className="text-xs font-semibold text-danger">We couldn&apos;t update your bookmark. Please try again.</p> : null}
    </div>
  );
}
