import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance", "Date"] }));
afterEach(() => vi.useRealTimers());

describe("useCountdown", () => {
  it("counts down from the server's remainingSeconds", () => {
    const { result } = renderHook(() => useCountdown(90, () => {}));
    expect(result.current.seconds).toBe(90);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(result.current.seconds).toBe(80);
  });

  it("uses the monotonic clock, not wall-clock differences", () => {
    const { result } = renderHook(() => useCountdown(90, () => {}));
    // The wall clock jumps an hour (NTP step, manual change): the countdown must not notice.
    vi.setSystemTime(Date.now() + 3_600_000);
    act(() => void vi.advanceTimersByTime(5_000));
    expect(result.current.seconds).toBe(85);
  });

  it("re-syncs when a response carries a different remainingSeconds", () => {
    const { result } = renderHook(() => useCountdown(90, () => {}));
    act(() => void vi.advanceTimersByTime(10_000));
    act(() => result.current.sync(30));
    expect(result.current.seconds).toBe(30);
    act(() => void vi.advanceTimersByTime(4_000));
    expect(result.current.seconds).toBe(26);
  });

  it("calls onZero exactly once at zero", () => {
    const onZero = vi.fn();
    const { result } = renderHook(() => useCountdown(3, onZero));
    act(() => void vi.advanceTimersByTime(2_000));
    expect(onZero).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(30_000));
    expect(result.current.seconds).toBe(0);
    expect(onZero).toHaveBeenCalledTimes(1);
    act(() => result.current.sync(0));
    act(() => void vi.advanceTimersByTime(5_000));
    expect(onZero).toHaveBeenCalledTimes(1);
  });

  it("is inert for an untimed session", () => {
    const onZero = vi.fn();
    const { result } = renderHook(() => useCountdown(null, onZero));
    act(() => void vi.advanceTimersByTime(60_000));
    expect(result.current.seconds).toBeNull();
    expect(onZero).not.toHaveBeenCalled();
  });
});
