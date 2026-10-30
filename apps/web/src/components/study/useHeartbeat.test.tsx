import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHeartbeat } from "./useHeartbeat";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = (active = true) => {
  const onBeat = vi.fn().mockResolvedValue(undefined);
  const onIdle = vi.fn();
  const r = renderHook((p: { active: boolean }) => useHeartbeat({ active: p.active, onBeat, onIdle }), {
    initialProps: { active },
  });
  return { onBeat, onIdle, ...r };
};
const tick = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

describe("useHeartbeat", () => {
  it("beats every 30 s with interacted true only after an event", async () => {
    const { onBeat } = setup();
    await tick(29_999);
    expect(onBeat).not.toHaveBeenCalled();
    act(() => void document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" })));
    await tick(1);
    expect(onBeat).toHaveBeenLastCalledWith(true);
    await tick(30_000);
    expect(onBeat).toHaveBeenCalledTimes(2);
    expect(onBeat).toHaveBeenLastCalledWith(false);
    act(() => void document.dispatchEvent(new Event("pointerdown")));
    await tick(30_000);
    expect(onBeat).toHaveBeenLastCalledWith(true);
  });

  it("calls onIdle after 3 minutes without interaction, not before", async () => {
    const { onBeat, onIdle } = setup();
    await tick(150_000);
    expect(onBeat).toHaveBeenCalledTimes(5);
    expect(onIdle).not.toHaveBeenCalled();
    await tick(30_000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("an interaction resets the idle clock", async () => {
    const { onIdle } = setup();
    await tick(150_000);
    act(() => void document.dispatchEvent(new Event("pointermove")));
    await tick(150_000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("does nothing while inactive", async () => {
    const { onBeat, onIdle } = setup(false);
    await tick(400_000);
    expect(onBeat).not.toHaveBeenCalled();
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("returning to the page beats at once, unless the idle limit has already passed", async () => {
    const { onBeat } = setup();
    await tick(10_000);
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    await tick(0);
    expect(onBeat).toHaveBeenCalledTimes(1);
    onBeat.mockClear();
    act(() => void vi.setSystemTime(Date.now() + 200_000)); // machine slept; timers have not fired
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    await tick(0);
    expect(onBeat).not.toHaveBeenCalled();
  });
});
