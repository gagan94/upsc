"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type { EndSessionInput, RecoverAction, StartSessionInput, StudySessionView } from "@/lib/types";
import { EndSessionDialog } from "./EndSessionDialog";
import { RecoveryDialog, StillStudyingDialog } from "./RecoveryDialog";
import { SessionConflictDialog, StartSessionDialog, type StartPrefill } from "./StartSessionDialog";
import { useHeartbeat } from "./useHeartbeat";

export type { StartPrefill } from "./StartSessionDialog";

export type StartResult = "started" | "conflict" | "error";

export interface StudySessionApi {
  session: StudySessionView | null;
  /** False until the first GET /study-sessions/active settled. */
  loaded: boolean;
  loadFailed: boolean;
  /** Seconds studied: the server's last activeSeconds plus at most 45 s of local counting since that response. */
  seconds: number;
  /** Last action failure, for the bar to show. */
  error: string | null;
  /** Short non-error notice (for example the session was already finished elsewhere). */
  notice: string | null;
  clearError: () => void;
  retryLoad: () => void;
  openStart: (prefill?: StartPrefill) => void;
  openEnd: () => void;
  openRecovery: () => void;
  start: (input: StartSessionInput) => Promise<StartResult>;
  pause: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  end: (input: EndSessionInput) => Promise<boolean>;
  discard: () => Promise<boolean>;
}

const Ctx = createContext<StudySessionApi | null>(null);
const StartCtx = createContext<((prefill?: StartPrefill) => void) | null>(null);

export function useStudySession(): StudySessionApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudySession needs a StudySessionProvider");
  return v;
}
/** Null outside the provider (login, onboarding, isolated component tests). */
export function useOptionalStudySession(): StudySessionApi | null {
  return useContext(Ctx);
}
/** Test seam: provides only the Start opener (what TaskRow needs). */
export const StartCtxForTest = StartCtx.Provider;
/** Stable opener of the Start dialog (does not re-render every second); null outside the provider. */
export function useStartSession() {
  return useContext(StartCtx);
}

interface Clock {
  id: string | null;
  base: number;
  at: number;
  running: boolean;
}
const IDLE_CLOCK: Clock = { id: null, base: 0, at: 0, running: false };
/** The server's activeSeconds is authoritative; locally we only extrapolate up to this many seconds past it. */
export const LOCAL_EXTRAPOLATION_S = 45;
const displayAt = (c: Clock, now: number) =>
  c.running ? c.base + Math.min(LOCAL_EXTRAPOLATION_S, Math.floor(Math.max(0, now - c.at) / 1000)) : c.base;

const FINISHED_NOTICE = "This session was already finished";

const post = <T,>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export function StudySessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StudySessionView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [clock, setClock] = useState<Clock>(IDLE_CLOCK);
  const [startPrefill, setStartPrefill] = useState<StartPrefill | null | undefined>(undefined);
  const [conflict, setConflict] = useState<{ active: StudySessionView | null; input: StartSessionInput } | null>(null);
  const [recoveryHidden, setRecoveryHidden] = useState(false);
  const [idlePrompt, setIdlePrompt] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const sessionRef = useRef<StudySessionView | null>(null);
  const clockRef = useRef<Clock>(IDLE_CLOCK);
  const idleBusy = useRef(false);
  /** Bumped by every local transition (pause, resume, end, start, recover, discard, clear); older in-flight responses are ignored. */
  const epoch = useRef(0);
  const resetMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const setClockBoth = (c: Clock) => {
    clockRef.current = c;
    setClock(c);
  };

  /** Adopt a server view: its activeSeconds replaces the base unconditionally. */
  const apply = useCallback((view: StudySessionView) => {
    const t = Date.now();
    sessionRef.current = view;
    setSession(view);
    setNow(t);
    setClockBoth({ id: view.id, base: view.activeSeconds, at: t, running: view.status === "running" && !view.stale });
  }, []);

  const clear = useCallback(() => {
    epoch.current += 1;
    sessionRef.current = null;
    setSession(null);
    setClockBoth(IDLE_CLOCK);
    setIdlePrompt(false);
    setEndOpen(false);
  }, []);

  const markStale = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    epoch.current += 1;
    const t = Date.now();
    const c = clockRef.current;
    const stale = { ...s, stale: true };
    sessionRef.current = stale;
    setSession(stale);
    setClockBoth({ ...c, base: displayAt(c, t), at: t, running: false });
    setRecoveryHidden(false);
    setIdlePrompt(false);
  }, []);

  const load = useCallback(async () => {
    const e0 = epoch.current;
    try {
      const r = await apiFetch<{ session: StudySessionView | null }>("/study-sessions/active");
      if (e0 !== epoch.current) return;
      setLoadFailed(false);
      if (r.session) {
        setRecoveryHidden(false);
        apply(r.session);
      } else clear();
    } catch {
      if (e0 === epoch.current) setLoadFailed(true);
    }
    setLoaded(true);
  }, [apply, clear]);

  useEffect(() => {
    void load();
  }, [load]);

  const running = session?.status === "running" && !session.stale;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const fail = useCallback(
    (e: unknown, text: string) => {
      if (e instanceof ApiError && e.code === "session_stale") markStale();
      else if (e instanceof ApiError && (e.code === "invalid_state" || e.code === "not_found")) void load();
      else setError(text);
    },
    [markStale, load],
  );

  /** One heartbeat. Resolves false when the session went stale, the response was superseded, or the call failed. */
  const beat = useCallback(
    async (interacted: boolean): Promise<boolean> => {
      const s = sessionRef.current;
      if (!s || s.stale) return false;
      const e0 = epoch.current;
      const current = () => epoch.current === e0 && sessionRef.current?.id === s.id;
      try {
        const r = await post<{ session: StudySessionView }>(`/study-sessions/${s.id}/heartbeat`, { interacted });
        if (!current()) return false; // a later local transition (or another session) owns the UI now
        apply(r.session);
        return true;
      } catch (e) {
        if (!current()) return false;
        if (e instanceof ApiError && e.code === "session_stale") markStale();
        else if (e instanceof ApiError && (e.code === "invalid_state" || e.code === "not_found")) void load();
        return false; // a network blip is retried by the next beat
      }
    },
    [apply, markStale, load],
  );

  /** Pause/resume: the time since the last heartbeat is only credited by a heartbeat, so send one first. */
  const transition = useCallback(
    async (kind: "pause" | "resume", interacted: boolean): Promise<boolean> => {
      const s = sessionRef.current;
      if (!s) return false;
      resetMessages();
      await beat(interacted);
      if (sessionRef.current?.id !== s.id || sessionRef.current.stale) return false;
      const e0 = ++epoch.current;
      try {
        const r = await post<{ session: StudySessionView }>(`/study-sessions/${s.id}/${kind}`);
        if (epoch.current !== e0) return false;
        apply(r.session);
        return true;
      } catch (e) {
        if (epoch.current === e0) fail(e, `Couldn't ${kind} the session. Try again.`);
        return false;
      }
    },
    [apply, beat, fail, resetMessages],
  );

  const pause = useCallback(() => transition("pause", true), [transition]);
  const resume = useCallback(async () => {
    const ok = await transition("resume", true);
    if (ok) setIdlePrompt(false);
    return ok;
  }, [transition]);

  const onIdle = useCallback(async () => {
    if (idleBusy.current) return;
    idleBusy.current = true;
    try {
      if (await transition("pause", false)) setIdlePrompt(true);
      else if (sessionRef.current?.status === "running" && !sessionRef.current.stale) await beat(false); // pause failed: keep beating
    } finally {
      idleBusy.current = false;
    }
  }, [transition, beat]);

  useHeartbeat({
    active: !!session && !session.stale && (session.status === "running" || session.status === "paused"),
    watchIdle: session?.status === "running",
    onBeat: beat,
    onIdle: () => void onIdle(),
  });

  const start = useCallback(
    async (input: StartSessionInput): Promise<StartResult> => {
      resetMessages();
      epoch.current += 1;
      try {
        const r = await post<{ session: StudySessionView }>("/study-sessions", input);
        setRecoveryHidden(false);
        apply(r.session);
        setStartPrefill(undefined);
        return "started";
      } catch (e) {
        if (e instanceof ApiError && e.code === "session_conflict") {
          const active = (e.details.active as StudySessionView | null | undefined) ?? null;
          setStartPrefill(undefined);
          if (active) setConflict({ active, input });
          else void load();
          return "conflict";
        }
        return "error";
      }
    },
    [apply, load, resetMessages],
  );

  /** The session was ended, discarded or recovered elsewhere: resync, close dialogs and say so. */
  const finishedElsewhere = useCallback(() => {
    setEndOpen(false);
    setIdlePrompt(false);
    setConflict(null);
    setNotice(FINISHED_NOTICE);
    void load();
  }, [load]);

  const end = useCallback(
    async (input: EndSessionInput): Promise<boolean> => {
      const s = sessionRef.current;
      if (!s) return false;
      resetMessages();
      await beat(true);
      if (sessionRef.current?.id !== s.id || sessionRef.current.stale) return false;
      const e0 = ++epoch.current;
      try {
        await post(`/study-sessions/${s.id}/end`, input);
        clear();
        return true;
      } catch (e) {
        if (epoch.current !== e0) return false;
        if (e instanceof ApiError && e.code === "session_stale") markStale();
        else if (e instanceof ApiError && (e.code === "invalid_state" || e.code === "not_found")) {
          finishedElsewhere();
          return true;
        }
        return false;
      }
    },
    [beat, clear, markStale, finishedElsewhere, resetMessages],
  );

  const discard = useCallback(async (): Promise<boolean> => {
    const s = sessionRef.current;
    if (!s) return false;
    resetMessages();
    epoch.current += 1;
    try {
      await post(`/study-sessions/${s.id}/discard`);
      clear();
      return true;
    } catch (e) {
      fail(e, "Couldn't discard the session. Try again.");
      return false;
    }
  }, [clear, fail, resetMessages]);

  const recover = useCallback(
    async (action: RecoverAction): Promise<boolean> => {
      const s = sessionRef.current;
      if (!s) return false;
      resetMessages();
      epoch.current += 1;
      try {
        const r = await post<{ session: StudySessionView }>(`/study-sessions/${s.id}/recover`, { action });
        if (action === "resume") apply(r.session);
        else clear();
        return true;
      } catch (e) {
        if (e instanceof ApiError && (e.code === "invalid_state" || e.code === "not_found")) void load();
        else setError("Couldn't recover the session. Try again.");
        return false;
      }
    },
    [apply, clear, load, resetMessages],
  );

  const continueOther = useCallback(() => {
    if (conflict?.active) {
      setRecoveryHidden(false);
      apply(conflict.active);
    }
    setConflict(null);
  }, [conflict, apply]);

  const endOtherAndStart = useCallback(async () => {
    if (!conflict?.active) return false;
    const { active, input } = conflict;
    resetMessages();
    try {
      if (!active.stale) await post(`/study-sessions/${active.id}/heartbeat`, { interacted: true }).catch(() => undefined);
      await post(`/study-sessions/${active.id}/end`);
    } catch (e) {
      if (e instanceof ApiError && (e.code === "invalid_state" || e.code === "not_found")) finishedElsewhere();
      else {
        setError("Couldn't end the other session. Try again.");
        setConflict(null);
      }
      return false;
    }
    setConflict(null);
    return (await start(input)) === "started";
  }, [conflict, start, finishedElsewhere, resetMessages]);

  const openStart = useCallback((prefill?: StartPrefill) => {
    resetMessages();
    setStartPrefill(prefill ?? null);
  }, [resetMessages]);
  /** Opens the End dialog and syncs the server's time first, so the summary shows what will be recorded. */
  const openEnd = useCallback(() => {
    resetMessages();
    setEndOpen(true);
    void beat(true);
  }, [beat, resetMessages]);
  const openRecovery = useCallback(() => setRecoveryHidden(false), []);
  const clearError = useCallback(() => resetMessages(), [resetMessages]);
  const retryLoad = useCallback(() => void load(), [load]);

  const seconds = displayAt(clock, now);
  const api = useMemo<StudySessionApi>(
    () => ({
      session, loaded, loadFailed, seconds, error, notice, clearError, retryLoad, openStart, openEnd, openRecovery,
      start, pause, resume, end, discard,
    }),
    [session, loaded, loadFailed, seconds, error, notice, clearError, retryLoad, openStart, openEnd, openRecovery, start, pause, resume, end, discard],
  );

  return (
    <Ctx.Provider value={api}>
      <StartCtx.Provider value={openStart}>
        {children}
        <StartSessionDialog open={startPrefill !== undefined} prefill={startPrefill ?? null} onClose={() => setStartPrefill(undefined)} onStart={start} />
        <SessionConflictDialog
          open={conflict !== null}
          active={conflict?.active ?? null}
          onClose={() => setConflict(null)}
          onContinue={continueOther}
          onEndAndStart={endOtherAndStart}
        />
        <RecoveryDialog
          open={!!session?.stale && !recoveryHidden}
          session={session}
          onClose={() => setRecoveryHidden(true)}
          onRecover={recover}
        />
        <StillStudyingDialog
          open={idlePrompt && session?.status === "paused"}
          onClose={() => setIdlePrompt(false)}
          onResume={resume}
          onEnd={() => {
            setIdlePrompt(false);
            openEnd();
          }}
        />
        <EndSessionDialog open={endOpen && !!session && !session.stale} session={session} seconds={session?.activeSeconds ?? 0} onClose={() => setEndOpen(false)} onEnd={end} />
      </StartCtx.Provider>
    </Ctx.Provider>
  );
}
