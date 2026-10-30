import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));

import { AUTOSAVE_DEBOUNCE_MS, RETRY_DELAY_MS, RETRY_MAX_MS, useAutosave } from "./useAutosave";

const onResult = vi.fn();
const onTerminal = vi.fn();
const onConflict = vi.fn();
const setup = () => renderHook(() => useAutosave({ sessionId: "s1", onResult, onTerminal, onConflict }));
async function ms(n: number) {
  await act(async () => void (await vi.advanceTimersByTimeAsync(n)));
}
const bodies = () => apiFetch.mock.calls.map((c) => JSON.parse(c[1].body));

beforeEach(() => {
  vi.useFakeTimers();
  apiFetch.mockReset();
  apiFetch.mockResolvedValue({ saved: true });
  onResult.mockReset();
  onTerminal.mockReset();
  onConflict.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("useAutosave", () => {
  it("debounces rapid changes into one PUT and ends on Saved", async () => {
    const { result } = setup();
    act(() => result.current.save(1, { selected: "A" }));
    act(() => result.current.save(1, { selected: "B" }));
    expect(result.current.status).toBe("saving");
    expect(apiFetch).not.toHaveBeenCalled();
    await act(async () => void (await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch.mock.calls[0][0]).toBe("/practice/sessions/s1/answers/1");
    expect(apiFetch.mock.calls[0][1].method).toBe("PUT");
    expect(bodies()[0]).toEqual({ selected: "B" });
    expect(result.current.status).toBe("saved");
  });

  it("flush (blur) sends immediately and merges patches, summing time", async () => {
    const { result } = setup();
    act(() => result.current.save(2, { flagged: true, timeMsDelta: 1000 }));
    act(() => result.current.save(2, { confidence: "sure", timeMsDelta: 500 }));
    await act(async () => void (await result.current.flush()));
    expect(bodies()).toEqual([{ flagged: true, confidence: "sure", timeMsDelta: 1500 }]);
  });

  it("a failed save shows the error state, keeps the patch and retries automatically", async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(0, "network_error", "down"));
    const { result } = setup();
    act(() => result.current.save(1, { selected: "C" }));
    await act(async () => void (await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS)));
    expect(result.current.status).toBe("error");
    await act(async () => void (await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS)));
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(bodies()[1]).toEqual({ selected: "C" });
    expect(result.current.status).toBe("saved");
  });

  it("flush resolves false while a save is failing, true once it succeeds", async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(500, "internal", "boom"));
    const { result } = setup();
    act(() => result.current.save(1, { selected: "C" }));
    let ok: boolean | undefined;
    await act(async () => void (ok = await result.current.flush()));
    expect(ok).toBe(false);
    await act(async () => void (ok = await result.current.flush()));
    expect(ok).toBe(true);
  });

  it("reports the PUT result (learning feedback) per ordinal", async () => {
    const feedback = { correctOption: "B", correct: true, explanation: "Because." };
    apiFetch.mockResolvedValueOnce({ saved: true, feedback });
    const { result } = setup();
    await act(async () => void (await result.current.commit(3, { selected: "B" })));
    expect(onResult).toHaveBeenCalledWith(3, { saved: true, feedback });
  });

  it("409 session_expired and session_submitted are terminal and not retried", async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(409, "session_expired", "Time is up"));
    const { result } = setup();
    act(() => result.current.save(1, { selected: "A" }));
    await act(async () => void (await result.current.flush()));
    expect(onTerminal).toHaveBeenCalledWith("session_expired");
    await act(async () => void (await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS * 3)));
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("409 already_answered is dropped, reported and not retried", async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(409, "already_answered", "locked"));
    const { result } = setup();
    act(() => result.current.save(1, { selected: "A" }));
    await act(async () => void (await result.current.flush()));
    expect(onConflict).toHaveBeenCalledWith(1);
    await act(async () => void (await vi.advanceTimersByTimeAsync(RETRY_DELAY_MS * 3)));
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("two concurrent flushes both wait for the slow in-flight PUT", async () => {
    let release!: () => void;
    apiFetch.mockImplementation(() => new Promise((r) => (release = () => r({ saved: true }))));
    const { result } = setup();
    act(() => result.current.save(1, { selected: "A" }));
    const done: boolean[] = [];
    let p1!: Promise<boolean>, p2!: Promise<boolean>;
    await act(async () => {
      p1 = result.current.flush().then((v) => (done.push(v), v));
      await Promise.resolve();
      p2 = result.current.flush().then((v) => (done.push(v), v));
    });
    expect(done).toEqual([]); // PUT still in flight: neither may report success
    await act(async () => {
      release();
      await Promise.all([p1, p2]);
    });
    expect(done).toEqual([true, true]);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("a failed in-flight PUT makes every waiting flush report failure", async () => {
    let fail!: () => void;
    apiFetch.mockImplementation(() => new Promise((_r, rej) => (fail = () => rej(new ApiError(0, "network_error", "down")))));
    const { result } = setup();
    act(() => result.current.save(1, { selected: "A" }));
    let p1!: Promise<boolean>, p2!: Promise<boolean>;
    await act(async () => {
      p1 = result.current.flush();
      await Promise.resolve();
      p2 = result.current.flush();
    });
    apiFetch.mockImplementation(async () => {
      throw new ApiError(0, "network_error", "down");
    });
    await act(async () => {
      fail();
      expect(await p1).toBe(false);
      expect(await p2).toBe(false);
    });
  });

  it("backs off exponentially up to the cap and resets after success", async () => {
    apiFetch.mockRejectedValue(new ApiError(0, "network_error", "down"));
    const { result } = setup();
    act(() => result.current.save(1, { selected: "A" }));
    await act(async () => void (await result.current.flush()));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    await ms(RETRY_DELAY_MS - 1);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    await ms(1);
    expect(apiFetch).toHaveBeenCalledTimes(2); // after 3 s
    await ms(RETRY_DELAY_MS * 2 - 1);
    expect(apiFetch).toHaveBeenCalledTimes(2);
    await ms(1);
    expect(apiFetch).toHaveBeenCalledTimes(3); // after a further 6 s
    for (let i = 0; i < 6; i++) await ms(RETRY_MAX_MS);
    const n = apiFetch.mock.calls.length;
    await ms(RETRY_MAX_MS);
    expect(apiFetch.mock.calls.length).toBe(n + 1); // capped at 30 s
    apiFetch.mockResolvedValue({ saved: true });
    await ms(RETRY_MAX_MS);
    expect(result.current.status).toBe("saved");
  });

  it("flushes pending edits with keepalive on unmount and on pagehide", async () => {
    const { result, unmount } = setup();
    act(() => result.current.save(1, { selected: "A" }));
    await act(async () => void window.dispatchEvent(new Event("pagehide")));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch.mock.calls[0][1].keepalive).toBe(true);
    act(() => result.current.save(2, { flagged: true }));
    await act(async () => void unmount());
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toEqual({ flagged: true });
  });

  it("registers a beforeunload warning only while edits are unsaved or failing", async () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const count = (spy: typeof add) => spy.mock.calls.filter((c) => c[0] === "beforeunload").length;
    const { result } = setup();
    expect(count(add)).toBe(0);
    act(() => result.current.save(1, { selected: "A" }));
    expect(count(add)).toBe(1);
    await act(async () => void (await result.current.flush()));
    expect(result.current.status).toBe("saved");
    expect(count(remove)).toBe(1);
    apiFetch.mockRejectedValueOnce(new ApiError(0, "network_error", "down"));
    act(() => result.current.save(1, { selected: "B" }));
    await act(async () => void (await result.current.flush()));
    expect(result.current.status).toBe("error");
    expect(count(add)).toBe(3); // re-registered for the second saving span, then for error
    add.mockRestore();
    remove.mockRestore();
  });
});
