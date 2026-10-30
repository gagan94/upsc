"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { ApiError, apiFetch } from "@/lib/api";
import {
  OPTION_KEYS,
  diffBody,
  emptyForm,
  fromQuestion,
  publishBlockers,
  toBody,
  validateForm,
  type QuestionFormValues,
} from "@/lib/question-form";
import { nodeLabel, orderNodes } from "@/lib/syllabus";
import type { OptionKey, QuestionAdminView, SyllabusNode } from "@/lib/types";
import { NodesError } from "./NodesError";
import { StatusBadge, VerificationBadge } from "./StatusBadge";

function prettyMissing(m: unknown): string {
  const s = String(m);
  return s.startsWith("optionReasoning.") ? `reasoning for ${s.slice("optionReasoning.".length)}` : s;
}

export function QuestionForm({ nodes, question }: { nodes: SyllabusNode[] | null; question?: QuestionAdminView }) {
  const router = useRouter();
  const [saved, setSaved] = useState<QuestionAdminView | undefined>(question);
  const [v, setV] = useState<QuestionFormValues>(() => (question ? fromQuestion(question) : emptyForm()));
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const [focusTick, setFocusTick] = useState(0);
  // Move focus to the result banner after a lifecycle action so keyboard users keep their place.
  useEffect(() => {
    if (focusTick) bannerRef.current?.focus();
  }, [focusTick]);

  const set = <K extends keyof QuestionFormValues>(k: K, val: QuestionFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const dirty = !!saved && JSON.stringify(v) !== JSON.stringify(fromQuestion(saved));
  const keyChanged = !!saved && v.correctOption !== null && v.correctOption !== saved.correctOption;

  function adopt(q: QuestionAdminView) {
    setSaved(q);
    setV(fromQuestion(q));
    setReason("");
    setErrors({});
  }

  function fail(e: unknown) {
    if (e instanceof ApiError && e.code === "duplicate_stem") {
      setErrors((p) => ({ ...p, stem: "A question with this stem already exists" }));
      setBanner({ tone: "error", text: "This stem is already in the question bank." });
    } else if (e instanceof ApiError && e.code === "incomplete_question") {
      const missing = Array.isArray(e.details.missing) ? e.details.missing.map(prettyMissing).join(", ") : "";
      setBanner({ tone: "error", text: missing ? `Missing: ${missing}` : e.message });
    } else {
      setBanner({ tone: "error", text: e instanceof ApiError ? e.message : "Something went wrong. Please try again." });
    }
  }

  async function save() {
    setBanner(null);
    const errs = validateForm(v);
    if (saved && keyChanged && !reason.trim()) errs.reason = "Explain why the correct option is changing";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy("save");
    try {
      if (!saved) {
        const { question: q } = await apiFetch<{ question: QuestionAdminView }>("/admin/questions", {
          method: "POST",
          body: JSON.stringify(toBody(v)),
        });
        router.push(`/admin/questions/${q.id}`);
        return;
      }
      const body = diffBody(v, saved, keyChanged ? reason.trim() : undefined);
      if (!body) {
        setBanner({ tone: "success", text: "No changes to save." });
        return;
      }
      const { question: q } = await apiFetch<{ question: QuestionAdminView }>(`/admin/questions/${saved.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      adopt(q);
      setBanner({
        tone: "success",
        text: q.version !== saved.version ? `Saved. The correct option changed; this question is now version ${q.version}.` : "Saved.",
      });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function act(kind: "publish" | "retire" | "verify") {
    if (!saved) return;
    setBanner(null);
    setBusy(kind);
    try {
      const { question: q } = await apiFetch<{ question: QuestionAdminView }>(`/admin/questions/${saved.id}/${kind}`, {
        method: "POST",
        ...(kind === "verify" ? { body: JSON.stringify({}) } : {}),
      });
      setSaved(q);
      setV((p) => (dirty ? p : fromQuestion(q)));
      setBanner({ tone: "success", text: kind === "publish" ? "Published." : kind === "retire" ? "Retired." : "Verified." });
      setFocusTick((t) => t + 1);
    } catch (e) {
      fail(e);
      setFocusTick((t) => t + 1);
    } finally {
      setBusy(null);
    }
  }

  // Disabled-with-reason for the three lifecycle actions (based on the saved question, as the API checks it).
  let publishWhy: string | null = null;
  let retireWhy: string | null = null;
  let verifyWhy: string | null = null;
  if (saved) {
    const blockers = publishBlockers(saved);
    if (saved.status === "published") publishWhy = "Already published.";
    else if (dirty) publishWhy = "Save your changes first, then publish.";
    else if (blockers.length) publishWhy = `Cannot publish yet: missing ${blockers.join(", ")}.`;
    if (saved.status === "retired") retireWhy = "Already retired.";
    else if (saved.status === "draft") retireWhy = "Only a published question can be retired.";
    if (saved.verificationStatus === "verified") verifyWhy = "Already verified.";
    else if (dirty) verifyWhy = "Save your changes first, then verify.";
    else if (saved.sourceType === "pyq" && (saved.pyqYear == null || !saved.pyqPaper)) {
      verifyWhy = "Add the PYQ year and paper and save before verifying.";
    }
  }

  if (!nodes) return <NodesError />;
  const subjectOptions = [{ value: "", label: "Choose a subject" }, ...orderNodes(nodes).map((n) => ({ value: n.id, label: nodeLabel(n) }))];

  return (
    <form
      className="mt-4 flex max-w-3xl flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {saved && (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={saved.status} />
          <VerificationBadge status={saved.verificationStatus} />
          <span className="rounded-control border border-border bg-bg px-2 py-0.5 text-xs font-semibold">Version {saved.version}</span>
        </div>
      )}
      {banner && (
        <div ref={bannerRef} tabIndex={-1} className="outline-none focus-visible:outline-2 focus-visible:outline-primary">
          <Banner tone={banner.tone}>{banner.text}</Banner>
        </div>
      )}

      <Select
        label="Format"
        value={v.format}
        onChange={(e) => set("format", e.target.value as QuestionFormValues["format"])}
        options={[
          { value: "single", label: "Single question" },
          { value: "statements", label: "Statements" },
        ]}
      />
      <Field label="Stem" multiline rows={3} value={v.stem} onChange={(e) => set("stem", e.target.value)} error={errors.stem} />

      {v.format === "statements" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">Statements</legend>
          {v.statements.map((s, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <Field
                  label={`Statement ${i + 1}`}
                  value={s}
                  onChange={(e) => set("statements", v.statements.map((x, j) => (j === i ? e.target.value : x)))}
                />
              </div>
              {v.statements.length > 1 && (
                <Button variant="secondary" size="sm" aria-label={`Remove statement ${i + 1}`} onClick={() => set("statements", v.statements.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          {errors.statements && <p role="alert" className="text-xs font-semibold text-danger">{errors.statements}</p>}
          <div>
            <Button variant="secondary" size="sm" disabled={v.statements.length >= 10} onClick={() => set("statements", [...v.statements, ""])}>
              Add statement
            </Button>
          </div>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend id="options-legend" className="text-sm font-semibold">Options (exactly four; mark the correct one)</legend>
        <div role="radiogroup" aria-labelledby="options-legend" className="flex flex-col gap-4">
        {OPTION_KEYS.map((k: OptionKey) => (
          <div key={k} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3">
            <Field
              label={`Option ${k} text`}
              value={v.options[k]}
              onChange={(e) => set("options", { ...v.options, [k]: e.target.value })}
              error={errors[`options.${k}`]}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="correctOption"
                checked={v.correctOption === k}
                onChange={() => set("correctOption", k)}
                aria-label={`Option ${k} is correct`}
              />
              Correct answer
            </label>
            <Field
              label={`Reasoning for option ${k}`}
              multiline
              rows={2}
              value={v.reasoning[k]}
              onChange={(e) => set("reasoning", { ...v.reasoning, [k]: e.target.value })}
              error={errors[`reasoning.${k}`]}
            />
          </div>
        ))}
        </div>
        {errors.correctOption && <p role="alert" className="text-xs font-semibold text-danger">{errors.correctOption}</p>}
      </fieldset>

      {saved && keyChanged && (
        <Field
          label="Reason for changing the correct option"
          hint={`This bumps the question to version ${saved.version + 1} and is recorded in its history.`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          error={errors.reason}
        />
      )}

      <Field label="Explanation" multiline rows={4} value={v.explanation} onChange={(e) => set("explanation", e.target.value)} error={errors.explanation} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Misconception option"
          value={v.misconceptionOption}
          onChange={(e) => set("misconceptionOption", e.target.value as QuestionFormValues["misconceptionOption"])}
          options={[{ value: "", label: "None" }, ...OPTION_KEYS.map((k) => ({ value: k, label: `Option ${k}` }))]}
          error={errors.misconceptionOption}
        />
        <Field label="Misconception" value={v.misconceptionText} onChange={(e) => set("misconceptionText", e.target.value)} error={errors.misconceptionText} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Difficulty"
          value={v.difficulty}
          onChange={(e) => set("difficulty", e.target.value as QuestionFormValues["difficulty"])}
          options={[
            { value: "easy", label: "Easy" },
            { value: "medium", label: "Medium" },
            { value: "hard", label: "Hard" },
          ]}
        />
        <Field label="GS paper" value={v.gsPaper} onChange={(e) => set("gsPaper", e.target.value)} error={errors.gsPaper} />
        <Select
          label="Subject"
          value={v.subjectNodeId}
          onChange={(e) => set("subjectNodeId", e.target.value)}
          options={subjectOptions}
          error={errors.subjectNodeId}
        />
        <Field label="Topic" value={v.topic} onChange={(e) => set("topic", e.target.value)} error={errors.topic} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Source type"
          value={v.sourceType}
          onChange={(e) => set("sourceType", e.target.value as QuestionFormValues["sourceType"])}
          options={[
            { value: "platform", label: "Platform" },
            { value: "pyq", label: "Previous year (PYQ)" },
            { value: "ai_generated", label: "AI generated" },
          ]}
        />
        <Field label="PYQ year" inputMode="numeric" value={v.pyqYear} onChange={(e) => set("pyqYear", e.target.value)} error={errors.pyqYear} />
        <Field label="PYQ paper" value={v.pyqPaper} onChange={(e) => set("pyqPaper", e.target.value)} error={errors.pyqPaper} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy === "save"}>
          {saved ? "Save changes" : "Create question"}
        </Button>
      </div>

      {saved && (
        <section aria-label="Lifecycle actions" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Lifecycle</h2>
          {(
            [
              ["publish", "Publish", publishWhy, "primary"],
              ["retire", "Retire", retireWhy, "danger"],
              ["verify", "Verify", verifyWhy, "secondary"],
            ] as const
          ).map(([kind, label, why, variant]) => (
            <div key={kind} className="flex flex-wrap items-center gap-3">
              <Button
                variant={variant}
                disabled={!!why || busy !== null}
                loading={busy === kind}
                aria-describedby={why ? `${kind}-why` : undefined}
                onClick={() => void act(kind)}
              >
                {label}
              </Button>
              {why && (
                <span id={`${kind}-why`} className="text-xs text-muted">
                  {why}
                </span>
              )}
            </div>
          ))}
        </section>
      )}
    </form>
  );
}
