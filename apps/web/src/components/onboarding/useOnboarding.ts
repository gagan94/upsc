"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { targetYearToValue, valueToTargetYear } from "@/lib/prep-options";
import type {
  NewTask,
  OnboardingAnswers,
  OnboardingCompleteResult,
  OnboardingSaveBody,
  OnboardingView,
  PlanPreview,
  PrepPapers,
  PrepStage,
  ProfileView,
  StudyWindow,
  SubjectSummary,
} from "@/lib/types";

/** Wizard steps 0-3 are Preparation, Focus, Routine, Support; 4 is the Review. */
export const REVIEW_STEP = 4;
export const STEP_COUNT = 4;

export interface Draft {
  /** "2027" | "2028" | "exploring" | null (nothing chosen yet) */
  targetYear: string | null;
  stage: PrepStage | null;
  attempt: string;
  papers: PrepPapers | null;
  subjects: string[];
  dailyMin: number;
  weeklyMin: number;
  /** Once the user edits the weekly goal it no longer follows 7 x daily. */
  weeklyTouched: boolean;
  windows: StudyWindow[];
  support: string[];
}
export type StepErrors = Partial<Record<"targetYear" | "stage" | "papers" | "dailyMin" | "weeklyMin" | "windows", string>>;

export const DEFAULT_DAILY_MIN = 240;

export function answersToDraft(a: OnboardingAnswers): Draft {
  const dailyMin = a.routine?.dailyMin ?? DEFAULT_DAILY_MIN;
  const weeklyMin = a.routine?.weeklyMin ?? dailyMin * 7;
  return {
    targetYear: targetYearToValue(a.targetYear),
    stage: a.stage ?? null,
    attempt: a.attempt ?? "",
    papers: a.focus?.papers ?? null,
    subjects: a.focus?.subjects ?? [],
    dailyMin,
    weeklyMin,
    weeklyTouched: weeklyMin !== dailyMin * 7,
    windows: a.routine?.windows ?? [],
    support: a.support ?? [],
  };
}

export function validateStep(step: number, d: Draft): StepErrors {
  const e: StepErrors = {};
  if (step === 0) {
    if (d.targetYear === null) e.targetYear = "Choose a target year";
    if (!d.stage) e.stage = "Choose your stage";
  } else if (step === 1) {
    if (!d.papers) e.papers = "Choose which papers you are preparing";
  } else if (step === 2) {
    if (!Number.isInteger(d.dailyMin) || d.dailyMin < 30 || d.dailyMin > 960) e.dailyMin = "Choose 30 to 960 minutes a day";
    if (!Number.isInteger(d.weeklyMin) || d.weeklyMin < 30 || d.weeklyMin > 6720) e.weeklyMin = "Enter 30 to 6720 minutes";
    else if (!e.dailyMin && d.dailyMin > d.weeklyMin) e.weeklyMin = "Weekly goal must be at least your daily time";
    if (d.windows.length === 0) e.windows = "Choose at least one time of day";
  }
  return e;
}

/** The answers this step contributes. Unset fields are left out so partial saves stay valid. */
export function stepAnswers(step: number, d: Draft): OnboardingAnswers {
  if (step === 0) {
    return {
      ...(d.targetYear !== null ? { targetYear: valueToTargetYear(d.targetYear) } : {}),
      ...(d.stage ? { stage: d.stage } : {}),
      attempt: d.attempt || null,
    };
  }
  if (step === 1) return { focus: { ...(d.papers ? { papers: d.papers } : {}), subjects: d.subjects } };
  if (step === 2) return { routine: { dailyMin: d.dailyMin, weeklyMin: d.weeklyMin, windows: d.windows } };
  if (step === 3) return { support: d.support };
  return {};
}

type Load = { kind: "loading" } | { kind: "error" } | { kind: "ready" };
export type PreviewState =
  | { kind: "loading" }
  | { kind: "ready"; tasks: NewTask[] }
  | { kind: "error"; code?: string };

/** Plan failures that retrying cannot fix. */
export type PlanBlock = "catalog_empty" | "onboarding_incomplete";
function planBlock(e: unknown): PlanBlock | null {
  if (!(e instanceof ApiError)) return null;
  if (e.code === "catalog_empty" && e.status === 409) return "catalog_empty";
  if (e.code === "onboarding_incomplete" && e.status === 400) return "onboarding_incomplete";
  return null;
}

function clampStep(n: number) {
  return Math.min(REVIEW_STEP, Math.max(0, Number.isFinite(n) ? Math.floor(n) : 0));
}

export function useOnboarding() {
  const routerValue = useRouter();
  // Keep the router out of effect/callback dependencies so a new router object never re-triggers loads.
  const routerRef = useRef(routerValue);
  routerRef.current = routerValue;
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [loadKey, setLoadKey] = useState(0);
  const [step, setStep] = useState(0);
  const [draft, setDraftState] = useState<Draft>(() => answersToDraft({}));
  const [subjects, setSubjects] = useState<SubjectSummary[] | null>(null);
  const [tz, setTz] = useState("Asia/Kolkata");
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ kind: "loading" });
  const lastOp = useRef<(() => Promise<void>) | null>(null);
  const previewRequested = useRef(false);
  const previewSeq = useRef(0);
  const [planBlocked, setPlanBlocked] = useState<PlanBlock | null>(null);
  const [invalidTick, setInvalidTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoad({ kind: "loading" });
      try {
        const [view, subs, profile] = await Promise.all([
          apiFetch<OnboardingView>("/me/onboarding"),
          apiFetch<{ subjects: SubjectSummary[] }>("/learn/subjects").then((r) => r.subjects, () => null),
          apiFetch<ProfileView>("/me/profile").then((p) => p.timezone, () => null),
        ]);
        if (cancelled) return;
        if (view.status === "completed") {
          routerRef.current.replace("/home");
          return;
        }
        setDraftState(answersToDraft(view.answers ?? {}));
        setStep(clampStep(view.step));
        setSubjects(subs);
        setTz(profile ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Asia/Kolkata");
        setLoad({ kind: "ready" });
      } catch {
        if (!cancelled) setLoad({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  const setDraft = useCallback((patch: Partial<Draft>) => setDraftState((d) => ({ ...d, ...patch })), []);

  const runOp = useCallback(async (op: () => Promise<void>) => {
    lastOp.current = op;
    setSaving(true);
    setSaveFailed(false);
    try {
      await op();
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }, []);

  const put = useCallback(
    (body: OnboardingSaveBody) => apiFetch<OnboardingView>("/me/onboarding", { method: "PUT", body: JSON.stringify(body) }),
    [],
  );

  const next = useCallback(() => {
    if (saving || step >= REVIEW_STEP) return;
    setShowErrors(true);
    if (Object.keys(validateStep(step, draft)).length > 0) {
      setInvalidTick((t) => t + 1);
      return;
    }
    const body: OnboardingSaveBody = { step: step + 1, answers: stepAnswers(step, draft), status: "in_progress" };
    void runOp(async () => {
      await put(body);
      setStep(body.step);
      setShowErrors(false);
    });
  }, [saving, step, draft, runOp, put]);

  const back = useCallback(() => {
    setShowErrors(false);
    setSaveFailed(false);
    setPlanBlocked(null);
    // Answers may change before the user returns to Review: drop the old preview and fetch a fresh one.
    previewRequested.current = false;
    previewSeq.current += 1;
    setPreview({ kind: "loading" });
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const leave = useCallback(
    (status: "in_progress" | "skipped") => {
      if (saving) return;
      const body: OnboardingSaveBody = {
        step,
        answers: status === "skipped" ? {} : stepAnswers(step, draft),
        status,
      };
      void runOp(async () => {
        await put(body);
        routerRef.current.push("/home");
      });
    },
    [saving, step, draft, runOp, put],
  );
  const finishLater = useCallback(() => leave("in_progress"), [leave]);
  const skip = useCallback(() => leave("skipped"), [leave]);

  const complete = useCallback(
    (acceptPlan: boolean) => {
      if (saving) return;
      setPlanBlocked(null);
      void runOp(async () => {
        try {
          await apiFetch<OnboardingCompleteResult>("/me/onboarding/complete", {
            method: "POST",
            body: JSON.stringify({ acceptPlan }),
          });
        } catch (e) {
          const blocked = planBlock(e);
          if (blocked) {
            setPlanBlocked(blocked);
            return;
          }
          if (!(e instanceof ApiError && e.status === 409 && e.code === "already_completed")) throw e;
        }
        routerRef.current.replace("/home");
      });
    },
    [saving, runOp],
  );

  const retry = useCallback(() => {
    const op = lastOp.current;
    if (op && !saving) void runOp(op);
  }, [saving, runOp]);

  // The plan preview is requested once when the review step is first shown.
  const loadPreview = useCallback(async () => {
    const seq = ++previewSeq.current;
    setPreview({ kind: "loading" });
    try {
      const { tasks } = await apiFetch<PlanPreview>("/me/onboarding/plan-preview", { method: "POST" });
      if (seq === previewSeq.current) setPreview({ kind: "ready", tasks });
    } catch (e) {
      if (seq === previewSeq.current) setPreview({ kind: "error", code: planBlock(e) ?? undefined });
    }
  }, []);
  useEffect(() => {
    if (load.kind !== "ready" || step !== REVIEW_STEP || previewRequested.current) return;
    previewRequested.current = true;
    void loadPreview();
  }, [load.kind, step, loadPreview]);
  const retryPreview = useCallback(() => void loadPreview(), [loadPreview]);

  return {
    load: load.kind,
    reload: () => setLoadKey((k) => k + 1),
    step,
    draft,
    setDraft,
    errors: showErrors ? validateStep(step, draft) : ({} as StepErrors),
    subjects,
    tz,
    saving,
    saveFailed,
    retry,
    next,
    back,
    finishLater,
    skip,
    complete,
    preview,
    retryPreview,
    planBlocked,
    invalidTick,
  };
}
