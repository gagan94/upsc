"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { AnswerPayload, AnswerResult } from "@/lib/types";

export const AUTOSAVE_DEBOUNCE_MS = 800;
export const RETRY_DELAY_MS = 3000;
export const RETRY_MAX_MS = 30_000;
const MAX_TIME_DELTA_MS = 600_000;

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type TerminalCode = "session_expired" | "session_submitted";

const merge = (older: AnswerPayload | undefined, newer: AnswerPayload): AnswerPayload => {
  const out: AnswerPayload = { ...older, ...newer };
  if (older?.timeMsDelta !== undefined || newer.timeMsDelta !== undefined) {
    out.timeMsDelta = (older?.timeMsDelta ?? 0) + (newer.timeMsDelta ?? 0);
  }
  return out;
};

/**
 * Debounced, idempotent autosave of answer patches (PUT /practice/sessions/:id/answers/:ordinal).
 * One request at a time; a failed patch is kept and retried (automatically and via `flush`).
 */
export function useAutosave(opts: {
  sessionId: string;
  onResult: (ordinal: number, result: AnswerResult) => void;
  onTerminal: (code: TerminalCode) => void;
  onConflict: (ordinal: number) => void;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const pending = useRef(new Map<number, AnswerPayload>());
  const running = useRef<Promise<boolean> | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failures = useRef(0);
  const failed = useRef(false);
  const mounted = useRef(true);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });
  const setStatusSafe = useCallback((s: SaveStatus) => {
    if (mounted.current) setStatus(s);
  }, []);

  const drain = useCallback(async (): Promise<boolean> => {
    setStatusSafe("saving");
    while (pending.current.size) {
      const [ordinal, patch] = pending.current.entries().next().value as [number, AnswerPayload];
      pending.current.delete(ordinal);
      const body: AnswerPayload = { ...patch };
      if (body.timeMsDelta !== undefined) body.timeMsDelta = Math.min(MAX_TIME_DELTA_MS, Math.max(0, Math.round(body.timeMsDelta)));
      try {
        const result = await apiFetch<AnswerResult>(`/practice/sessions/${optsRef.current.sessionId}/answers/${ordinal}`, {
          method: "PUT",
          body: JSON.stringify(body),
          keepalive: true, // lets the request outlive the page when it is sent while unloading
        });
        if (mounted.current) optsRef.current.onResult(ordinal, result);
      } catch (e) {
        if (e instanceof ApiError && e.status === 409 && (e.code === "session_expired" || e.code === "session_submitted")) {
          pending.current.clear();
          failed.current = false;
          setStatusSafe("idle");
          if (mounted.current) optsRef.current.onTerminal(e.code);
          return true;
        }
        if (e instanceof ApiError && e.status === 409 && e.code === "already_answered") {
          if (mounted.current) optsRef.current.onConflict(ordinal);
          continue;
        }
        // Keep the failed patch; anything newer for the same question wins.
        const newer = pending.current.get(ordinal);
        pending.current.set(ordinal, newer ? merge(patch, newer) : patch);
        failed.current = true;
        setStatusSafe("error");
        if (retry.current) clearTimeout(retry.current);
        const delay = Math.min(RETRY_MAX_MS, RETRY_DELAY_MS * 2 ** failures.current);
        failures.current += 1;
        retry.current = setTimeout(() => {
          retry.current = null;
          if (mounted.current) void flushRef.current();
        }, delay);
        return false;
      }
    }
    failed.current = false;
    failures.current = 0;
    setStatusSafe("saved");
    return true;
  }, [setStatusSafe]);

  /** Sends everything pending now. Resolves true when nothing is left unsaved, false while a save is failing. */
  const flush = useCallback(async (): Promise<boolean> => {
    if (debounce.current) {
      clearTimeout(debounce.current);
      debounce.current = null;
    }
    if (retry.current) {
      clearTimeout(retry.current);
      retry.current = null;
    }
    // Success means: nothing pending, nothing in flight, and the last PUT did not fail.
    for (;;) {
      if (running.current) {
        await running.current;
        continue;
      }
      if (!pending.current.size) return !failed.current;
      const run = drain().finally(() => {
        if (running.current === run) running.current = null;
      });
      running.current = run;
      if (!(await run)) return false;
    }
  }, [drain]);
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  const save = useCallback(
    (ordinal: number, patch: AnswerPayload) => {
      pending.current.set(ordinal, merge(pending.current.get(ordinal), patch));
      setStatusSafe("saving");
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        debounce.current = null;
        void flushRef.current();
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [setStatusSafe],
  );

  /** Save now (no debounce); the PUT result is delivered through `onResult`. */
  const commit = useCallback(
    (ordinal: number, patch: AnswerPayload) => {
      save(ordinal, patch);
      return flush();
    },
    [save, flush],
  );

  useEffect(() => {
    mounted.current = true;
    const d = debounce;
    const r = retry;
    const queue = pending.current; // the Map instance never changes
    const onPageHide = () => void flushRef.current();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      // Leaving the page: send what is pending (keepalive PUT), fire and forget.
      const hasPending = queue.size > 0;
      mounted.current = false;
      if (d.current) clearTimeout(d.current);
      if (r.current) clearTimeout(r.current);
      if (hasPending) void flushRef.current();
    };
  }, []);

  // Warn before the tab closes while edits are unsaved or a save is failing.
  useEffect(() => {
    if (status !== "saving" && status !== "error") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  return { status, save, commit, flush };
}
