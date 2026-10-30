"use client";

import { RetryButton } from "@/components/RetryButton";

/** Shown when GET /admin/syllabus-nodes fails; the subject picker never falls back silently. */
export function NodesError() {
  return (
    <div role="alert" className="mt-4 rounded-card border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
      <p className="font-semibold">We couldn&apos;t load the subject list.</p>
      <RetryButton className="mt-2 rounded-control border border-danger-border px-3 py-1.5 font-semibold" />
    </div>
  );
}
