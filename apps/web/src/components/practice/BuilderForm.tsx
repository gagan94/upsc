"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import type { CreatedPracticeSession, PracticeAvailability, PracticeMode, PracticeSource, PracticeSubject } from "@/lib/types";
import { AvailabilityNotice, type AvailabilityState } from "./AvailabilityNotice";

const SOURCES = [
  { value: "platform", label: "Platform questions" },
  { value: "pyq", label: "PYQs only" },
  { value: "mixed", label: "Mixed" },
];
const COUNTS = [10, 20, 50];
const MAX_SUBJECTS = 10;
const DEBOUNCE_MS = 300;

/** Short-set message; the workspace (Task 18) reads it from the `?note=` query param. */
export const shortSetNote = (got: number, requested: number) => `Started with ${got} of ${requested} requested questions`;

export function BuilderForm({
  subjects,
  initialSubject,
  initialSource,
}: {
  subjects: PracticeSubject[];
  initialSubject?: string;
  initialSource?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(() => (initialSubject && subjects.some((s) => s.id === initialSubject) ? [initialSubject] : []));
  const [source, setSource] = useState<PracticeSource>(() => (initialSource === "pyq" || initialSource === "mixed" ? initialSource : "platform"));
  const [count, setCount] = useState(20);
  const [mode, setMode] = useState<PracticeMode>("learning");
  const [timed, setTimed] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityState>({ kind: "idle" });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = subjects.filter((s) => selected.includes(s.id));
  const noPyq = source === "pyq" && chosen.every((s) => s.pyqVerifiedCount === 0);
  const key = selected.join(",");

  useEffect(() => {
    if (!key) return setAvailability({ kind: "idle" });
    if (noPyq) return setAvailability({ kind: "no_pyq" });
    setAvailability({ kind: "loading" });
    let stale = false;
    const t = setTimeout(() => {
      apiFetch<PracticeAvailability>(`/practice/availability?subjects=${key}&source=${source}&count=${count}`)
        .then((data) => !stale && setAvailability({ kind: "ready", data }))
        .catch(() => !stale && setAvailability({ kind: "error" }));
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [key, source, count, noPyq]);

  const blocked = availability.kind === "ready" && availability.data.available === 0;
  const canStart = selected.length > 0 && !noPyq && !blocked && availability.kind !== "loading" && !starting;

  function toggle(id: string, on: boolean) {
    setSelected((cur) => (on ? [...cur, id] : cur.filter((x) => x !== id)));
  }

  async function onStart() {
    setStarting(true);
    setError(null);
    try {
      const res = await apiFetch<CreatedPracticeSession>("/practice/sessions", {
        method: "POST",
        body: JSON.stringify({ subjectNodeIds: selected, source, count, mode, timed }),
      });
      const note = res.got < res.requested ? `?note=${encodeURIComponent(shortSetNote(res.got, res.requested))}` : "";
      router.push(`/prelims/session/${res.session.id}${note}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We couldn't start the set. Please try again.");
      setStarting(false);
    }
  }

  const sourceLabel = SOURCES.find((s) => s.value === source)?.label;
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-text">Subjects</legend>
        <p className="text-xs text-muted">Choose up to {MAX_SUBJECTS}. {source === "pyq" ? "Counts are verified previous-year questions." : "Counts are published questions."}</p>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted">No practice questions are published yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {subjects.map((s) => {
              const on = selected.includes(s.id);
              const n = source === "pyq" ? s.pyqVerifiedCount : s.publishedCount;
              return (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-card border border-border bg-surface p-3 text-sm has-[:checked]:border-primary">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[var(--color-primary,currentColor)]"
                      checked={on}
                      disabled={!on && selected.length >= MAX_SUBJECTS}
                      onChange={(e) => toggle(s.id, e.target.checked)}
                    />
                    <span className="flex flex-col">
                      <span className="font-semibold text-text">{s.title}</span>
                      <span className="text-xs text-muted">{s.gsPaper} · {n} {n === 1 ? "question" : "questions"}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1"><span className="text-sm font-semibold text-text">Source</span>
          <Chips label="Source" options={SOURCES} value={source} onChange={(v) => setSource(v as PracticeSource)} /></div>
        <div className="flex flex-col gap-1"><span className="text-sm font-semibold text-text">Number of questions</span>
          <Chips label="Number of questions" options={COUNTS.map((c) => ({ value: String(c), label: String(c) }))} value={String(count)} onChange={(v) => setCount(Number(v))} /></div>
        <div className="flex flex-col gap-1"><span className="text-sm font-semibold text-text">Mode</span>
          <Chips label="Mode" options={[{ value: "learning", label: "Learning" }, { value: "test", label: "Test" }]} value={mode} onChange={(v) => setMode(v as PracticeMode)} />
          <p className="text-xs text-muted">Learning shows the answer and explanation after each question. Test holds them back until you submit.</p></div>
        <div className="flex flex-col gap-1"><span className="text-sm font-semibold text-text">Timing</span>
          <Chips label="Timing" options={[{ value: "timed", label: "Timed" }, { value: "untimed", label: "Untimed" }]} value={timed ? "timed" : "untimed"} onChange={(v) => setTimed(v === "timed")} /></div>
      </div>

      <AvailabilityNotice state={availability} />

      <section aria-labelledby="review-heading" className="rounded-card border border-border bg-surface p-4">
        <h2 id="review-heading" className="text-base font-bold text-text">Review practice set</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Subjects</dt>
          <dd className="text-text">{chosen.length ? chosen.map((s) => s.title).join(", ") : "None selected"}</dd>
          <dt className="text-muted">Source</dt><dd className="text-text">{sourceLabel}</dd>
          <dt className="text-muted">Questions</dt><dd className="text-text">{count}</dd>
          <dt className="text-muted">Mode</dt><dd className="text-text">{mode === "test" ? "Test" : "Learning"}</dd>
          <dt className="text-muted">Timing</dt><dd className="text-text">{timed ? "Timed" : "Untimed"}</dd>
        </dl>
        {error ? <Banner tone="error" className="mt-3">{error}</Banner> : null}
        <Button className="mt-4" disabled={!canStart} loading={starting} onClick={onStart}>Start</Button>
      </section>
    </div>
  );
}
