"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { formatDuration } from "@/lib/format";
import type { EndSessionInput, StudySessionView } from "@/lib/types";

export function EndSessionDialog({
  open,
  session,
  seconds,
  onClose,
  onEnd,
}: {
  open: boolean;
  session: StudySessionView | null;
  seconds: number;
  onClose: () => void;
  onEnd: (input: EndSessionInput) => Promise<boolean>;
}) {
  return (
    <Modal open={open && session !== null} onClose={onClose} title="End study session">
      {session ? <EndForm session={session} seconds={seconds} onClose={onClose} onEnd={onEnd} /> : null}
    </Modal>
  );
}

function EndForm({ session, seconds, onClose, onEnd }: { session: StudySessionView; seconds: number; onClose: () => void; onEnd: (i: EndSessionInput) => Promise<boolean> }) {
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const reached = seconds >= session.plannedMin * 60;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    const input: EndSessionInput = {
      ...(rating !== null ? { focusRating: rating } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(complete ? { completeTask: true } : {}),
    };
    const ok = await onEnd(input);
    if (!ok) {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Time studied</dt>
          <dd className="text-lg font-bold text-text">{formatDuration(seconds)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Target ({session.plannedMin} min)</dt>
          <dd className="text-lg font-bold text-text">{reached ? "Target reached" : "Not reached"}</dd>
        </div>
      </dl>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-text">Focus rating</legend>
        <div role="radiogroup" aria-label="Focus rating" className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-control border text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${
                rating === n ? "border-primary bg-primary text-primary-text" : "border-border bg-surface text-text"
              }`}
            >
              <input type="radio" name="focus" className="sr-only" checked={rating === n} onChange={() => setRating(n)} />
              {n}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Notes" multiline rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {session.taskId ? (
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} />
          Mark linked task complete
        </label>
      ) : null}
      {failed ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          Couldn&apos;t end the session. Please try again.
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Keep studying
        </Button>
        <Button type="submit" loading={busy}>
          End session
        </Button>
      </div>
    </form>
  );
}
