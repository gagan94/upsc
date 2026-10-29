"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import {
  ATTEMPT_OPTIONS,
  PAPER_OPTIONS,
  STAGE_OPTIONS,
  TARGET_YEAR_OPTIONS,
  targetYearToValue,
  valueToTargetYear,
} from "@/lib/prep-options";
import type { PrepPapers, PrepProfileView, PrepStage, SubjectSummary } from "@/lib/types";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import { Select } from "@/components/ui/Select";
import { SaveFeedback } from "./SaveFeedback";
import { useSaveState } from "./useSaveState";

export function PreparationForm({ initial, subjects }: { initial: PrepProfileView; subjects: SubjectSummary[] | null }) {
  const [year, setYear] = useState<string | null>(targetYearToValue(initial.targetYear));
  const [stage, setStage] = useState<PrepStage | null>(initial.stage);
  const [attempt, setAttempt] = useState(initial.attempt ?? "");
  const [papers, setPapers] = useState<PrepPapers | null>(initial.focus.papers ?? null);
  const [chosen, setChosen] = useState<string[]>(initial.focus.subjects ?? []);
  const [touched, setTouched] = useState(false);
  const { state, run, reset } = useSaveState();

  const stageError = touched && !stage ? "Choose your stage" : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!stage) return;
    const body = {
      targetYear: year === null ? null : valueToTargetYear(year),
      stage,
      attempt: attempt || null,
      focus: { ...(papers ? { papers } : {}), subjects: chosen },
    };
    await run(async () => {
      await apiFetch("/me/preparation-profile", { method: "PUT", body: JSON.stringify(body) });
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-5">
      <Chips label="Target year" options={TARGET_YEAR_OPTIONS} value={year} onChange={(v) => { setYear(v); reset(); }} />
      <div className="flex flex-col gap-1">
        <Chips label="Preparation stage" options={STAGE_OPTIONS} value={stage} onChange={(v) => { setStage(v as PrepStage); reset(); }} />
        {stageError ? <p role="alert" className="text-xs font-semibold text-danger">{stageError}</p> : null}
      </div>
      <Select
        label="Attempt (optional)"
        value={attempt}
        onChange={(e) => { setAttempt(e.target.value); reset(); }}
        options={[{ value: "", label: "Not set" }, ...ATTEMPT_OPTIONS]}
      />
      <Chips label="Papers" options={PAPER_OPTIONS} value={papers} onChange={(v) => { setPapers(v as PrepPapers); reset(); }} />
      {subjects === null ? (
        <Banner tone="warning">We couldn&apos;t load the subject list, so your focus subjects are unchanged.</Banner>
      ) : (
        <Chips
          label="Focus subjects"
          multiple
          options={subjects.map((s) => ({ value: s.slug, label: s.title }))}
          value={chosen}
          onChange={(v) => { setChosen(v); reset(); }}
        />
      )}
      <SaveFeedback state={state} savedText="Preparation profile saved." />
      <div>
        <Button type="submit" loading={state.kind === "saving"}>Save changes</Button>
      </div>
    </form>
  );
}
