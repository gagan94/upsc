"use client";

import { useRouter } from "next/navigation";

/** Re-renders the current route (re-runs server components) instead of navigating away. */
export function RetryButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.refresh()} className={className}>
      Try again
    </button>
  );
}
