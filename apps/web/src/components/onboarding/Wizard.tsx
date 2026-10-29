"use client";

import { useEffect, useRef } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Review } from "./Review";
import { FocusStep } from "./steps/FocusStep";
import { PreparationStep } from "./steps/PreparationStep";
import { RoutineStep } from "./steps/RoutineStep";
import { SupportStep } from "./steps/SupportStep";
import { REVIEW_STEP, STEP_COUNT, useOnboarding } from "./useOnboarding";

const TITLES = ["Your preparation", "Your focus", "Your routine", "Support you want", "Review your plan"];
const INTROS = [
  "Tell us about your exam plans so we can tailor your workspace.",
  "Choose the papers and subjects you want to concentrate on.",
  "How much can you study, and when?",
  "Anything else you would like help with?",
  "Here is a starter week. You can change everything later in the planner.",
];

export function Wizard() {
  const o = useOnboarding();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the new step's heading when the step changes (not on first load).
  useEffect(() => {
    if (o.load !== "ready") return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [o.step, o.load]);

  if (o.load === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading your setup" className="flex flex-col gap-3">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (o.load === "error") {
    return (
      <div role="alert" className="rounded-card border border-danger-border bg-danger-bg p-4">
        <p className="font-semibold text-danger">We couldn&apos;t load your setup</p>
        <p className="mt-1 text-sm text-danger">Please check your connection and try again.</p>
        <Button className="mt-3" onClick={o.reload}>
          Try again
        </Button>
      </div>
    );
  }

  const { step, draft, setDraft, errors } = o;
  const stepProps = { draft, setDraft, errors };
  const onReview = step === REVIEW_STEP;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {onReview ? "Final step" : `Step ${step + 1} of ${STEP_COUNT}`}
        </p>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={STEP_COUNT}
          aria-valuenow={step}
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border"
        >
          <div className="h-full bg-primary" style={{ width: `${(Math.min(step, STEP_COUNT) / STEP_COUNT) * 100}%` }} />
        </div>
        <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-bold text-text focus:outline-none">
          {TITLES[step]}
        </h1>
        <p className="mt-1 text-sm text-muted">{INTROS[step]}</p>
      </div>

      {o.saveFailed ? (
        <Banner tone="error">
          <p className="font-semibold">Could not save your setup</p>
          <p className="mt-1">Your answers are still here. Check your connection and retry.</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={o.retry} loading={o.saving}>
            Retry
          </Button>
        </Banner>
      ) : null}

      {step === 0 ? <PreparationStep {...stepProps} /> : null}
      {step === 1 ? <FocusStep {...stepProps} subjects={o.subjects} /> : null}
      {step === 2 ? <RoutineStep {...stepProps} /> : null}
      {step === 3 ? <SupportStep {...stepProps} /> : null}
      {onReview ? (
        <Review
          preview={o.preview}
          tz={o.tz}
          busy={o.saving}
          onAccept={() => o.complete(true)}
          onEmpty={() => o.complete(false)}
          onRetryPreview={o.retryPreview}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex gap-3">
          {step > 0 ? (
            <Button variant="secondary" onClick={o.back} disabled={o.saving}>
              Back
            </Button>
          ) : null}
          {!onReview ? (
            <Button onClick={o.next} loading={o.saving}>
              Next
            </Button>
          ) : null}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={o.finishLater} disabled={o.saving}>
            Save and finish later
          </Button>
          <Button variant="ghost" size="sm" onClick={o.skip} disabled={o.saving}>
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
