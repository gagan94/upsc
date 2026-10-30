"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ApiError, apiFetch } from "@/lib/api";
import type { AnswerResult, Confidence, OptionKey, PracticeQuestionView, PracticeSessionDetail } from "@/lib/types";
import { NavigationPanel } from "./NavigationPanel";
import { QuestionView } from "./QuestionView";
import { SubmitDialog } from "./SubmitDialog";
import { TimerBadge } from "./TimerBadge";
import { useAutosave, type SaveStatus } from "./useAutosave";
import { useCountdown } from "./useCountdown";

const KEYS: OptionKey[] = ["A", "B", "C", "D"];
const MIN_TIME_DELTA_MS = 1000;
const SAVE_TEXT: Record<SaveStatus, string> = { idle: "", saving: "Saving…", saved: "Saved", error: "Could not save — retrying" };

/** Defence in depth: in test mode the client never holds feedback, whatever a payload carried. */
const sanitize = (q: PracticeQuestionView, learning: boolean): PracticeQuestionView => {
  if (learning) return q;
  const { feedback: _dropped, ...rest } = q;
  void _dropped;
  return rest;
};

function startIndex(qs: PracticeQuestionView[], learning: boolean, initialOrdinal?: number): number {
  if (initialOrdinal !== undefined && Number.isFinite(initialOrdinal)) {
    return Math.min(qs.length, Math.max(1, Math.trunc(initialOrdinal))) - 1;
  }
  const first = qs.findIndex((q) => !isAnswered(q, learning));
  return first >= 0 ? first : 0;
}

/** Learning mode counts a question as answered only once checked (that is when the server stores it). */
const isAnswered = (q: PracticeQuestionView, learning: boolean) => (learning ? q.feedback !== undefined : q.selected !== null);

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
};

export function Workspace({ initial, note, initialOrdinal }: { initial: PracticeSessionDetail; note: string | null; initialOrdinal?: number }) {
  const router = useRouter();
  const { id, mode } = initial.session;
  const learning = mode === "learning";
  const [qs, setQs] = useState(() => initial.questions.map((q) => sanitize(q, learning)));
  const [idx, setIdx] = useState(() => startIndex(initial.questions, learning, initialOrdinal));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false);
  const [checking, setChecking] = useState(false);

  const resultsPath = `/prelims/results/${id}`;
  const navigated = useRef(false);
  const submitLock = useRef(false);
  const enteredAt = useRef(performance.now());
  const resultsRef = useRef(resultsPath);

  const toResults = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.push(resultsRef.current);
  }, [router]);

  const patchQuestion = useCallback((ordinal: number, fn: (q: PracticeQuestionView) => PracticeQuestionView) => {
    setQs((cur) => cur.map((q) => (q.ordinal === ordinal ? fn(q) : q)));
  }, []);

  /** Re-reads the server's view; every response that carries remainingSeconds re-syncs the timer. */
  const countdownRef = useRef<{ sync: (s: number | null) => void } | null>(null);
  const refetch = useCallback(
    async (replaceOrdinal?: number) => {
      try {
        const fresh = await apiFetch<PracticeSessionDetail>(`/practice/sessions/${id}`);
        if (fresh.session.status !== "in_progress") return toResults();
        countdownRef.current?.sync(fresh.session.remainingSeconds);
        if (replaceOrdinal !== undefined) {
          const q = fresh.questions.find((x) => x.ordinal === replaceOrdinal);
          if (q) patchQuestion(replaceOrdinal, () => sanitize(q, learning));
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) toResults();
        // Otherwise keep running on the last known sync; the next response re-syncs.
      }
    },
    [id, learning, patchQuestion, toResults],
  );

  const autosave = useAutosave({
    sessionId: id,
    onResult: (ordinal: number, res: AnswerResult) => {
      if (learning && res.feedback) patchQuestion(ordinal, (q) => ({ ...q, feedback: res.feedback }));
    },
    onTerminal: () => {
      submitLock.current = true;
      toResults();
    },
    onConflict: (ordinal) => void refetch(ordinal),
  });

  const autoSubmit = useCallback(async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    try {
      await apiFetch(`/practice/sessions/${id}/submit`, { method: "POST" });
      toResults();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) return toResults();
      submitLock.current = false;
      setAutoSubmitFailed(true);
    }
  }, [id, toResults]);

  const countdown = useCountdown(initial.session.remainingSeconds, () => void autoSubmit());
  countdownRef.current = countdown;

  const current = qs[idx];
  const total = qs.length;

  /** Time on the question we are leaving, sent with the next autosave. */
  const recordTime = useCallback(() => {
    const now = performance.now();
    const delta = Math.round(now - enteredAt.current);
    enteredAt.current = now;
    const q = qs[idx];
    if (q && delta >= MIN_TIME_DELTA_MS) autosave.save(q.ordinal, { timeMsDelta: delta });
  }, [autosave, idx, qs]);

  const go = useCallback(
    (to: number) => {
      const next = Math.min(total - 1, Math.max(0, to));
      if (next === idx) return;
      recordTime();
      setIdx(next);
    },
    [idx, recordTime, total],
  );

  // Keep the position in the URL so a refresh lands on the same question.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("q", String(idx + 1));
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* position restore is best-effort */
    }
  }, [idx]);

  // Re-sync with the server when the tab returns (a suspended laptop pauses the monotonic clock).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "hidden") void autosave.flush();
      else void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [autosave, refetch]);

  const select = useCallback(
    (key: OptionKey) => {
      const q = qs[idx];
      if (!q || (learning && q.feedback)) return;
      const next = !learning && q.selected === key ? null : key;
      if (learning && q.selected === key) return;
      patchQuestion(q.ordinal, (x) => ({ ...x, selected: next }));
      if (!learning) autosave.save(q.ordinal, { selected: next });
    },
    [autosave, idx, learning, patchQuestion, qs],
  );

  const clear = useCallback(() => {
    const q = qs[idx];
    if (!q || learning) return;
    patchQuestion(q.ordinal, (x) => ({ ...x, selected: null }));
    autosave.save(q.ordinal, { selected: null });
  }, [autosave, idx, learning, patchQuestion, qs]);

  const flag = useCallback(() => {
    const q = qs[idx];
    if (!q) return;
    patchQuestion(q.ordinal, (x) => ({ ...x, flagged: !x.flagged }));
    autosave.save(q.ordinal, { flagged: !q.flagged });
  }, [autosave, idx, patchQuestion, qs]);

  const confidence = useCallback(
    (c: Confidence) => {
      const q = qs[idx];
      if (!q) return;
      patchQuestion(q.ordinal, (x) => ({ ...x, confidence: c }));
      autosave.save(q.ordinal, { confidence: c, ...(learning ? {} : { selected: q.selected }) });
    },
    [autosave, idx, learning, patchQuestion, qs],
  );

  const check = useCallback(async () => {
    const q = qs[idx];
    if (!q || q.selected === null || checking) return;
    setChecking(true);
    try {
      await autosave.commit(q.ordinal, { selected: q.selected });
    } finally {
      setChecking(false);
    }
  }, [autosave, checking, idx, qs]);

  const openDialog = useCallback(() => {
    recordTime();
    setSubmitError(null);
    setDialogOpen(true);
  }, [recordTime]);

  const saveAndNext = useCallback(async () => {
    await autosave.flush();
    if (idx === total - 1) openDialog();
    else go(idx + 1);
  }, [autosave, go, idx, openDialog, total]);

  const submit = useCallback(async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!(await autosave.flush())) {
        setSubmitError("Could not save your latest answers. Check your connection, then submit again.");
        submitLock.current = false;
        return;
      }
      await apiFetch(`/practice/sessions/${id}/submit`, { method: "POST" });
      toResults();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) return toResults();
      setSubmitError("We couldn't submit your answers. Please try again.");
      submitLock.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [autosave, id, toResults]);

  // Keyboard: A-D select, N next, P previous, F flag. Never while typing, with modifiers or over a dialog.
  const keyState = useRef({ select, flag, go, idx, dialogOpen, submitting });
  useEffect(() => {
    keyState.current = { select, flag, go, idx, dialogOpen, submitting };
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const s = keyState.current;
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || s.dialogOpen || s.submitting) return;
      const k = e.key.toUpperCase();
      if ((KEYS as string[]).includes(k)) s.select(k as OptionKey);
      else if (k === "N") s.go(s.idx + 1);
      else if (k === "P") s.go(s.idx - 1);
      else if (k === "F") s.flag();
      else return;
      e.preventDefault();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!current) {
    return <Banner tone="error">This set has no questions.</Banner>;
  }

  const items = qs.map((q) => ({ ordinal: q.ordinal, answered: isAnswered(q, learning), flagged: q.flagged }));
  const unanswered = items.filter((i) => !i.answered).length;
  const flagged = items.filter((i) => i.flagged).length;
  const saveText = SAVE_TEXT[autosave.status];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">{`Practice · Question ${current.ordinal} of ${total}`}</h1>
          <p className="text-xs text-muted">{learning ? "Learning mode" : "Test mode"} · Sample questions</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {countdown.seconds !== null ? <TimerBadge seconds={countdown.seconds} /> : null}
          <span data-testid="save-status" aria-live="polite" className={`text-xs ${autosave.status === "error" ? "font-semibold text-danger" : "text-muted"}`}>
            {saveText}
          </span>
          {autosave.status === "error" ? (
            <Button size="sm" variant="secondary" onClick={() => void autosave.flush()}>Retry</Button>
          ) : null}
          <Button onClick={openDialog} disabled={submitting}>Submit</Button>
        </div>
      </header>

      {note ? <Banner tone="info">{note}</Banner> : null}
      {autoSubmitFailed ? (
        <Banner tone="error">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Time is up, but we couldn&apos;t submit your answers.</span>
            <Button size="sm" onClick={() => void submit()}>Submit now</Button>
          </div>
        </Banner>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <QuestionView
          key={current.ordinal}
          question={current}
          mode={mode}
          isFirst={idx === 0}
          isLast={idx === total - 1}
          checking={checking}
          onSelect={select}
          onClear={clear}
          onFlag={flag}
          onConfidence={confidence}
          onCheck={() => void check()}
          onPrevious={() => go(idx - 1)}
          onNext={() => go(idx + 1)}
          onSkip={() => go(idx + 1)}
          onSaveNext={() => void saveAndNext()}
          onBlur={() => void autosave.flush()}
        />
        <NavigationPanel items={items} current={idx} onGo={go} />
      </div>

      <SubmitDialog
        open={dialogOpen}
        unanswered={unanswered}
        flagged={flagged}
        submitting={submitting}
        error={submitError}
        onConfirm={() => void submit()}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
