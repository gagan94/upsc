"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { StartSessionInput, StudySessionView, SubjectSummary } from "@/lib/types";
import type { StartResult } from "./StudySessionProvider";

export interface StartPrefill {
  taskId?: string;
  title?: string;
  subjectNodeId?: string | null;
  subjectTitle?: string | null;
}

export const PRESETS = [25, 45, 60, 90] as const;
const MIN = 5;
const MAX = 240;

export function StartSessionDialog({
  open,
  prefill,
  onClose,
  onStart,
}: {
  open: boolean;
  prefill: StartPrefill | null;
  onClose: () => void;
  onStart: (input: StartSessionInput) => Promise<StartResult>;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Start study session">
      <StartForm prefill={prefill} onClose={onClose} onStart={onStart} />
    </Modal>
  );
}

function StartForm({ prefill, onClose, onStart }: { prefill: StartPrefill | null; onClose: () => void; onStart: (i: StartSessionInput) => Promise<StartResult> }) {
  const [preset, setPreset] = useState<number>(25);
  const [custom, setCustom] = useState("");
  const [taskId, setTaskId] = useState(prefill?.taskId ?? "");
  const [subject, setSubject] = useState(prefill?.subjectNodeId ?? "");
  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>([]);
  const [lengthError, setLengthError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    apiFetch<{ subjects: SubjectSummary[] }>("/learn/subjects")
      .then((r) => live && setSubjects(r.subjects.map((s) => ({ value: s.id, label: s.title }))))
      .catch(() => undefined); // the subject is optional
    return () => {
      live = false;
    };
  }, []);

  const options = [{ value: "", label: "No subject" }, ...subjects];
  if (prefill?.subjectNodeId && !subjects.some((s) => s.value === prefill.subjectNodeId)) {
    options.push({ value: prefill.subjectNodeId, label: prefill.subjectTitle ?? "Task subject" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    let plannedMin = preset;
    if (custom !== "") {
      const n = Number(custom);
      if (!Number.isInteger(n) || n < MIN || n > MAX) {
        setLengthError(`Enter whole minutes between ${MIN} and ${MAX}`);
        return;
      }
      plannedMin = n;
    }
    setLengthError(null);
    setFailed(false);
    setBusy(true);
    const input: StartSessionInput = { plannedMin, ...(taskId ? { taskId } : {}), ...(subject ? { subjectNodeId: subject } : {}) };
    const r = await onStart(input);
    setBusy(false);
    if (r === "error") setFailed(true);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-text">Length</legend>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((m) => {
            const on = custom === "" && preset === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setPreset(m);
                  setCustom("");
                  setLengthError(null);
                }}
                className={`rounded-control border px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  on ? "border-primary bg-primary text-primary-text" : "border-border bg-surface text-text hover:bg-bg"
                }`}
              >
                {m} min
              </button>
            );
          })}
        </div>
        <Field
          label="Custom (minutes)"
          type="number"
          inputMode="numeric"
          min={MIN}
          max={MAX}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          error={lengthError}
        />
      </fieldset>
      {taskId ? (
        <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg px-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="block text-xs text-muted">Linked task</span>
            <span className="block break-words font-semibold text-text">{prefill?.title ?? "Selected task"}</span>
          </span>
          <Button size="sm" variant="ghost" onClick={() => setTaskId("")}>
            Unlink
          </Button>
        </div>
      ) : null}
      <Select label="Subject (optional)" options={options} value={subject} onChange={(e) => setSubject(e.target.value)} />
      {failed ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          Couldn&apos;t start the session. Please try again.
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          Start
        </Button>
      </div>
    </form>
  );
}

/** 409 session_conflict: another session is already running or paused. */
export function SessionConflictDialog({
  open,
  active,
  onClose,
  onContinue,
  onEndAndStart,
}: {
  open: boolean;
  active: StudySessionView | null;
  onClose: () => void;
  onContinue: () => void;
  onEndAndStart: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Session conflict">
      <p className="text-sm text-text">You already have a study session in progress.</p>
      {active ? (
        <p className="mt-2 rounded-control border border-border bg-bg px-3 py-2 text-sm text-text">
          {active.status === "paused" ? "Paused" : "Running"} · {`${active.plannedMin} min`} planned ·{" "}
          {formatDuration(active.activeSeconds)} studied
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onContinue}>
          Continue the other session
        </Button>
        <Button
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await onEndAndStart();
            setBusy(false);
          }}
        >
          End it and start new
        </Button>
      </div>
    </Modal>
  );
}
