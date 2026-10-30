"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ApiError, apiFetch } from "@/lib/api";
import type { GoalsView as Goals, ProgressView } from "@/lib/types";
import type { SubjectOption } from "./TaskDialog";
import { ProgressBars } from "./ProgressBars";

const MAX_DAILY = 1440;
const MAX_WEEKLY = 10080;
const MINUTES_ERROR = (max: number) => `Enter whole minutes between 1 and ${max}`;
const SAVE_ERROR = "We couldn't save your goals. Please try again.";

const wholeMinutes = (v: string, max: number) => /^\d+$/.test(v.trim()) && Number(v) >= 1 && Number(v) <= max;
const errorText = (e: unknown) => (e instanceof ApiError && e.status === 400 ? e.message : SAVE_ERROR);

type Status = { kind: "saved" | "error"; text: string } | null;

export function GoalsView({ goals: initial, progress: initialProgress, subjects }: { goals: Goals; progress: ProgressView; subjects: SubjectOption[] }) {
  const [goals, setGoals] = useState(initial);
  const [daily, setDaily] = useState(String(initial.dailyMin));
  const [weekly, setWeekly] = useState(String(initial.weeklyMin));
  const [milestone, setMilestone] = useState(initial.monthlyMilestone ?? "");
  const [date, setDate] = useState(initial.milestoneDate ?? "");
  const [errors, setErrors] = useState<{ daily?: string; weekly?: string }>({});
  const [status, setStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);

  const [editingTargets, setEditingTargets] = useState(false);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [targetErrors, setTargetErrors] = useState<Record<string, string>>({});
  const [targetStatus, setTargetStatus] = useState<Status>(null);
  const [savingTargets, setSavingTargets] = useState(false);
  const [subjectTargets, setSubjectTargets] = useState(initial.subjectTargets);
  // One target input per syllabus node (targets are keyed by node id, not catalog subject id).
  const targetSubjects = subjects.filter((s, i) => subjects.findIndex((o) => o.syllabusNodeId === s.syllabusNodeId) === i);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    const next: typeof errors = {};
    if (!wholeMinutes(daily, MAX_DAILY)) next.daily = MINUTES_ERROR(MAX_DAILY);
    if (!wholeMinutes(weekly, MAX_WEEKLY)) next.weekly = MINUTES_ERROR(MAX_WEEKLY);
    if (!next.daily && !next.weekly && Number(daily) > Number(weekly)) next.daily = "Daily goal cannot be more than the weekly goal";
    setErrors(next);
    if (next.daily || next.weekly) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ goals: Goals }>("/planner/goals", {
        method: "PUT",
        body: JSON.stringify({
          dailyMin: Number(daily),
          weeklyMin: Number(weekly),
          monthlyMilestone: milestone.trim() === "" ? null : milestone.trim(),
          milestoneDate: date === "" ? null : date,
        }),
      });
      setGoals(res.goals);
      setStatus({ kind: "saved", text: "Goals saved" });
    } catch (err) {
      setStatus({ kind: "error", text: errorText(err) });
    } finally {
      setSaving(false);
    }
  }

  function openTargets() {
    setTargets(Object.fromEntries(subjectTargets.map((t) => [t.subjectNodeId, String(t.weeklyMin)])));
    setTargetErrors({});
    setTargetStatus(null);
    setEditingTargets(true);
  }

  async function saveTargets(e: FormEvent) {
    e.preventDefault();
    setTargetStatus(null);
    const errs: Record<string, string> = {};
    const list: { subjectNodeId: string; weeklyMin: number }[] = [];
    for (const s of targetSubjects) {
      const v = (targets[s.syllabusNodeId] ?? "").trim();
      if (v === "") continue;
      if (!wholeMinutes(v, MAX_WEEKLY)) errs[s.syllabusNodeId] = MINUTES_ERROR(MAX_WEEKLY);
      else list.push({ subjectNodeId: s.syllabusNodeId, weeklyMin: Number(v) });
    }
    // PUT replaces the whole list: keep saved targets for subjects this form does not show.
    const shown = new Set(targetSubjects.map((s) => s.syllabusNodeId));
    for (const t of subjectTargets) if (!shown.has(t.subjectNodeId)) list.push(t);
    setTargetErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingTargets(true);
    try {
      const res = await apiFetch<{ goals: Goals }>("/planner/goals", { method: "PUT", body: JSON.stringify({ subjectTargets: list }) });
      setSubjectTargets(res.goals.subjectTargets);
      setTargetStatus({ kind: "saved", text: "Targets saved" });
    } catch (err) {
      setTargetStatus({ kind: "error", text: errorText(err) });
    } finally {
      setSavingTargets(false);
    }
  }

  // Progress reflects the saved goal and targets, not unsaved edits.
  const progress: ProgressView = {
    ...initialProgress,
    totals: { ...initialProgress.totals, goalMin: goals.weeklyMin },
    subjects: mergeTargets(initialProgress.subjects, subjectTargets, subjects),
  };

  return (
    <div className="grid grid-cols-1 gap-gap lg:grid-cols-2">
      <form onSubmit={(e) => void submit(e)} noValidate aria-label="Study goals" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
        <h3 className="font-bold text-text">Goals</h3>
        <Field label="Daily goal (minutes)" type="number" inputMode="numeric" min={1} max={MAX_DAILY} value={daily} onChange={(e) => setDaily(e.target.value)} error={errors.daily} />
        <Field label="Weekly goal (minutes)" type="number" inputMode="numeric" min={1} max={MAX_WEEKLY} value={weekly} onChange={(e) => setWeekly(e.target.value)} error={errors.weekly} />
        <Field label="Monthly milestone" maxLength={200} value={milestone} onChange={(e) => setMilestone(e.target.value)} hint="For example: finish Polity revision" />
        <Field label="Milestone date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            Save goals
          </Button>
          <StatusText status={status} />
        </div>
      </form>

      <div className="flex flex-col gap-4">
        <ProgressBars progress={progress} />
        <section aria-labelledby="targets-h" className="rounded-card border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 id="targets-h" className="font-bold text-text">
              Weekly subject targets
            </h3>
            {!editingTargets ? (
              <Button variant="secondary" size="sm" onClick={openTargets}>
                Edit weekly subject targets
              </Button>
            ) : null}
          </div>
          {editingTargets ? (
            <form onSubmit={(e) => void saveTargets(e)} noValidate className="mt-3 flex flex-col gap-3">
              <p className="text-sm text-muted">Leave a subject blank for no target.</p>
              {targetSubjects.map((s) => (
                <Field
                  key={s.syllabusNodeId}
                  label={`Weekly target for ${s.title} (minutes)`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_WEEKLY}
                  value={targets[s.syllabusNodeId] ?? ""}
                  onChange={(e) => setTargets((t) => ({ ...t, [s.syllabusNodeId]: e.target.value }))}
                  error={targetErrors[s.syllabusNodeId]}
                />
              ))}
              <div className="flex items-center gap-3">
                <Button type="submit" loading={savingTargets}>
                  Save targets
                </Button>
                <Button variant="secondary" onClick={() => setEditingTargets(false)}>
                  Done
                </Button>
                <StatusText status={targetStatus} />
              </div>
            </form>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {subjectTargets.length ? `${subjectTargets.length} subject${subjectTargets.length === 1 ? "" : "s"} with a weekly target.` : "No subject targets yet."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusText({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role={status.kind === "error" ? "alert" : "status"} className={`text-sm font-semibold ${status.kind === "error" ? "text-danger" : "text-primary"}`}>
      {status.text}
    </p>
  );
}

/** Apply the latest saved targets to the week's per-subject rows (adding rows for newly targeted subjects). */
function mergeTargets(rows: ProgressView["subjects"], targets: Goals["subjectTargets"], subjects: SubjectOption[]): ProgressView["subjects"] {
  const byId = new Map(targets.map((t) => [t.subjectNodeId, t.weeklyMin]));
  const out = rows.map((r) => ({ ...r, targetMin: byId.get(r.subjectNodeId) ?? null }));
  for (const t of targets) {
    if (out.some((r) => r.subjectNodeId === t.subjectNodeId)) continue;
    out.push({ subjectNodeId: t.subjectNodeId, title: subjects.find((s) => s.syllabusNodeId === t.subjectNodeId)?.title ?? "", plannedMin: 0, recordedMin: 0, targetMin: t.weeklyMin });
  }
  return out;
}
