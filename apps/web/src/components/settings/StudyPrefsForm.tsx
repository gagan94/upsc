"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { WINDOW_OPTIONS } from "@/lib/prep-options";
import type { StudyPrefsView, StudyWindow, WeekStart } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { SaveFeedback } from "./SaveFeedback";
import { useSaveState } from "./useSaveState";

const SESSION_OPTIONS = [15, 25, 30, 45, 60, 90, 120, 150, 180].map((m) => ({ value: String(m), label: `${m} minutes` }));

export function StudyPrefsForm({ initial }: { initial: StudyPrefsView }) {
  const [daily, setDaily] = useState(String(initial.dailyGoalMin));
  const [weekly, setWeekly] = useState(String(initial.weeklyGoalMin));
  const [windows, setWindows] = useState<StudyWindow[]>(initial.windows);
  const [weekStart, setWeekStart] = useState<WeekStart>(initial.weekStart);
  const [session, setSession] = useState(String(initial.defaultSessionMin));
  const [touched, setTouched] = useState(false);
  const { state, run, reset } = useSaveState();

  const d = Number(daily);
  const w = Number(weekly);
  const dailyError = !Number.isInteger(d) || d < 30 || d > 960 ? "Enter 30 to 960 minutes" : null;
  const weeklyError =
    !Number.isInteger(w) || w < 30 || w > 6720
      ? "Enter 30 to 6720 minutes"
      : !dailyError && d > w
        ? "Weekly goal must be at least your daily goal"
        : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (dailyError || weeklyError) return;
    const body: StudyPrefsView = {
      dailyGoalMin: d,
      weeklyGoalMin: w,
      windows,
      weekStart,
      defaultSessionMin: Number(session),
      remindersEnabled: initial.remindersEnabled,
    };
    await run(async () => {
      await apiFetch("/me/study-preferences", { method: "PUT", body: JSON.stringify(body) });
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-5">
      <Field label="Daily goal (minutes)" type="number" inputMode="numeric" min={30} max={960} value={daily} onChange={(e) => { setDaily(e.target.value); reset(); }} error={touched ? dailyError : null} />
      <Field label="Weekly goal (minutes)" type="number" inputMode="numeric" min={30} max={6720} value={weekly} onChange={(e) => { setWeekly(e.target.value); reset(); }} error={touched ? weeklyError : null} />
      <Chips label="Preferred study windows" multiple options={WINDOW_OPTIONS} value={windows} onChange={(v) => { setWindows(v as StudyWindow[]); reset(); }} />
      <Select
        label="Week starts on"
        value={weekStart}
        onChange={(e) => { setWeekStart(e.target.value as WeekStart); reset(); }}
        options={[{ value: "monday", label: "Monday" }, { value: "sunday", label: "Sunday" }]}
      />
      <Select label="Default session length" value={session} onChange={(e) => { setSession(e.target.value); reset(); }} options={SESSION_OPTIONS} />
      <SaveFeedback state={state} savedText="Study preferences saved." />
      <div>
        <Button type="submit" loading={state.kind === "saving"}>Save changes</Button>
      </div>
    </form>
  );
}
