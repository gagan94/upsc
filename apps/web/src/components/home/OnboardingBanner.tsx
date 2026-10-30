import Link from "next/link";
import type { OnboardingStatus } from "@/lib/types";

/** Nudge for students who have not finished onboarding. Renders nothing once completed. */
export function OnboardingBanner({ status }: { status: OnboardingStatus }) {
  if (status === "completed") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary bg-surface px-4 py-3">
      <p className="text-sm text-text">Tell us about your preparation and we will tailor your plan.</p>
      <Link href="/onboarding" className="rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-text">
        Finish personalising my workspace
      </Link>
    </div>
  );
}
