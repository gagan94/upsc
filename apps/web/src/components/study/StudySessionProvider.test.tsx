import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { StudySessionView } from "@/lib/types";
import userEvent from "../planner/user-shim";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));

import { SessionBar } from "./SessionBar";
import { StudySessionProvider, useStartSession } from "./StudySessionProvider";

const session = (o: Partial<StudySessionView> = {}): StudySessionView => ({
  id: "s1",
  status: "running",
  plannedMin: 25,
  startedAt: "2026-10-14T04:30:00.000Z",
  activeSeconds: 0,
  pausedSeconds: 0,
  taskId: null,
  subjectNodeId: null,
  stale: false,
  ...o,
});

type Handler = (body: unknown) => unknown;
let routes: Record<string, Handler>;
const calls = (key: string) => apiFetch.mock.calls.filter(([p, i]) => `${i?.method ?? "GET"} ${p}` === key);
const bodyOf = (c: unknown[]) => JSON.parse(((c[1] as RequestInit).body as string) ?? "{}");

beforeEach(() => {
  vi.useFakeTimers();
  apiFetch.mockReset();
  routes = { "GET /study-sessions/active": () => ({ session: null }), "GET /learn/subjects": () => ({ subjects: [] }) };
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const h = routes[`${init?.method ?? "GET"} ${path}`];
    if (!h) throw new Error(`unrouted ${init?.method ?? "GET"} ${path}`);
    const out = h(init?.body ? JSON.parse(init.body as string) : undefined);
    if (out instanceof Error) throw out;
    return out;
  });
});
afterEach(() => vi.useRealTimers());

const tick = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const mount = async (ui = <SessionBar />) => {
  render(<StudySessionProvider>{ui}</StudySessionProvider>);
  await tick(0);
};
const btn = (name: string | RegExp) => screen.getByRole("button", { name });

describe("StudySessionProvider + SessionBar", () => {
  it("shows the idle bar and starts a session from the dialog", async () => {
    await mount();
    expect(screen.getByText("No active session")).toBeInTheDocument();
    routes["POST /study-sessions"] = () => ({ session: session({ plannedMin: 45 }) });
    await userEvent.click(btn("Study session"));
    const dlg = screen.getByRole("dialog", { name: "Start study session" });
    await userEvent.click(within(dlg).getByRole("button", { name: "45 min" }));
    await userEvent.click(within(dlg).getByRole("button", { name: "Start" }));
    expect(bodyOf(calls("POST /study-sessions")[0])).toEqual({ plannedMin: 45 });
    expect(screen.getByRole("timer")).toHaveTextContent("0:00");
    expect(btn("Pause")).toBeInTheDocument();
  });

  it("start dialog accepts a custom length and rejects out-of-range values", async () => {
    await mount();
    await userEvent.click(btn("Study session"));
    const dlg = screen.getByRole("dialog");
    const custom = within(dlg).getByLabelText("Custom (minutes)");
    await userEvent.type(custom, "3");
    await userEvent.click(within(dlg).getByRole("button", { name: "Start" }));
    expect(within(dlg).getByRole("alert")).toHaveTextContent("5 and 240");
    expect(calls("POST /study-sessions")).toHaveLength(0);
  });

  it("starts from a task, prefilled with its id and subject", async () => {
    routes["POST /study-sessions"] = () => ({ session: session({ taskId: "t9" }) });
    function Opener() {
      const open = useStartSession()!;
      return <button onClick={() => open({ taskId: "t9", title: "Read ch 3", subjectNodeId: "n1" })}>go</button>;
    }
    await mount(<Opener />);
    await userEvent.click(btn("go"));
    const dlg = screen.getByRole("dialog", { name: "Start study session" });
    expect(within(dlg).getByText("Read ch 3")).toBeInTheDocument();
    await userEvent.click(within(dlg).getByRole("button", { name: "Start" }));
    expect(bodyOf(calls("POST /study-sessions")[0])).toEqual({ plannedMin: 25, taskId: "t9", subjectNodeId: "n1" });
  });

  it("409 session_conflict opens the conflict dialog with the other session; continue adopts it", async () => {
    const other = session({ id: "s0", plannedMin: 60, activeSeconds: 600 });
    routes["POST /study-sessions"] = () => new ApiError(409, "session_conflict", "x", { active: other });
    await mount();
    await userEvent.click(btn("Study session"));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Start" }));
    const dlg = screen.getByRole("dialog", { name: "Session conflict" });
    expect(dlg).toHaveTextContent("60 min");
    expect(dlg).toHaveTextContent("10:00");
    await userEvent.click(within(dlg).getByRole("button", { name: "Continue the other session" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("timer")).toHaveTextContent("10:00");
  });

  it("conflict: end the other and start new ends it then starts again", async () => {
    const other = session({ id: "s0" });
    let n = 0;
    routes["POST /study-sessions"] = () => (n++ === 0 ? new ApiError(409, "session_conflict", "x", { active: other }) : { session: session({ id: "s2" }) });
    routes["POST /study-sessions/s0/heartbeat"] = () => ({ session: other });
    routes["POST /study-sessions/s0/end"] = () => ({ session: { ...other, status: "ended" } });
    await mount();
    await userEvent.click(btn("Study session"));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Start" }));
    await userEvent.click(btn("End it and start new"));
    expect(calls("POST /study-sessions/s0/end")).toHaveLength(1);
    expect(calls("POST /study-sessions")).toHaveLength(2);
    expect(screen.getByRole("timer")).toBeInTheDocument();
  });

  describe("recovery", () => {
    const stale = () => session({ stale: true, activeSeconds: 300 });
    it.each([
      ["Resume", "resume"],
      ["End at last activity", "end"],
      ["Discard", "discard"],
    ])("%s calls recover with %s", async (label, action) => {
      routes["GET /study-sessions/active"] = () => ({ session: stale() });
      routes["POST /study-sessions/s1/recover"] = () => ({ session: session({ status: action === "resume" ? "running" : "ended" }) });
      await mount();
      const dlg = screen.getByRole("dialog", { name: "Recover your session?" });
      await userEvent.click(within(dlg).getByRole("button", { name: label }));
      expect(bodyOf(calls("POST /study-sessions/s1/recover")[0])).toEqual({ action });
      expect(screen.queryByRole("dialog")).toBeNull();
      if (action === "resume") expect(screen.getByRole("timer")).toBeInTheDocument();
      else expect(screen.getByText("No active session")).toBeInTheDocument();
    });

    it("a 409 session_stale heartbeat (return from sleep) opens Recovery, not a generic error", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session() });
      await mount();
      routes["POST /study-sessions/s1/heartbeat"] = () => new ApiError(409, "session_stale", "stale");
      routes["GET /study-sessions/active"] = () => ({ session: session({ stale: true }) });
      await tick(30_000);
      expect(screen.getByRole("dialog", { name: "Recover your session?" })).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).toBeNull();
    });
  });

  describe("heartbeat and timer", () => {
    it("beats every 30 s with interacted from events; no backward jitter when the server is at or ahead of the local estimate", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session({ activeSeconds: 100 }) });
      await mount();
      await tick(20_000);
      expect(screen.getByRole("timer")).toHaveTextContent("2:00");
      routes["POST /study-sessions/s1/heartbeat"] = () => ({ session: session({ activeSeconds: 140 }) }); // ahead of 130
      act(() => void document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" })));
      await tick(10_000);
      expect(bodyOf(calls("POST /study-sessions/s1/heartbeat")[0])).toEqual({ interacted: true });
      expect(screen.getByRole("timer")).toHaveTextContent("2:20");
      await tick(1000);
      expect(screen.getByRole("timer")).toHaveTextContent("2:21");
      routes["POST /study-sessions/s1/heartbeat"] = () => ({ session: session({ activeSeconds: 200 }) });
      await tick(29_000);
      expect(bodyOf(calls("POST /study-sessions/s1/heartbeat")[1])).toEqual({ interacted: false });
      expect(screen.getByRole("timer")).toHaveTextContent("3:20");
    });

    it("the server is authoritative: idle beats that credit nothing snap the display back to the server value", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session({ activeSeconds: 100 }) });
      routes["POST /study-sessions/s1/heartbeat"] = () => ({ session: session({ activeSeconds: 100 }) }); // interacted:false -> nothing credited
      await mount();
      await tick(29_000);
      expect(screen.getByRole("timer")).toHaveTextContent("2:09");
      await tick(1_000);
      expect(screen.getByRole("timer")).toHaveTextContent("1:40");
      await tick(30_000);
      expect(screen.getByRole("timer")).toHaveTextContent("1:40");
      expect(calls("POST /study-sessions/s1/heartbeat")).toHaveLength(2);
    });

    it("extrapolates at most 45 s past the last server value", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session({ activeSeconds: 100 }) });
      routes["POST /study-sessions/s1/heartbeat"] = () => new ApiError(0, "network_error", "down");
      await mount();
      await tick(40_000);
      expect(screen.getByRole("timer")).toHaveTextContent("2:20");
      await tick(10_000);
      expect(screen.getByRole("timer")).toHaveTextContent("2:25");
      await tick(5_000);
      expect(screen.getByRole("timer")).toHaveTextContent("2:25");
    });

    it("ignores a heartbeat response that was in flight when the session ended", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session() });
      let release!: () => void;
      let n = 0;
      routes["POST /study-sessions/s1/heartbeat"] = () =>
        n++ === 0 ? new Promise((r) => (release = () => r({ session: session({ activeSeconds: 30 }) }))) : { session: session() };
      routes["POST /study-sessions/s1/end"] = () => ({ session: session({ status: "ended" }) });
      await mount();
      await tick(30_000); // first beat is now pending
      await userEvent.click(btn("End"));
      const dlg = screen.getByRole("dialog", { name: "End study session" });
      await userEvent.click(within(dlg).getByRole("button", { name: "End session" }));
      expect(screen.getByText("No active session")).toBeInTheDocument();
      await act(async () => release());
      expect(screen.getByText("No active session")).toBeInTheDocument();
      expect(screen.queryByRole("timer")).toBeNull();
    });

    it("ignores a heartbeat response that arrives after the pause response", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session() });
      let release!: () => void;
      let n = 0;
      routes["POST /study-sessions/s1/heartbeat"] = () =>
        n++ === 0 ? new Promise((r) => (release = () => r({ session: session({ activeSeconds: 30 }) }))) : { session: session() };
      routes["POST /study-sessions/s1/pause"] = () => ({ session: session({ status: "paused" }) });
      await mount();
      await tick(30_000);
      await userEvent.click(btn("Pause"));
      expect(btn("Resume")).toBeInTheDocument();
      await act(async () => release());
      expect(btn("Resume")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    });

    it("keeps beating when the idle pause request fails, and shows no prompt", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session() });
      routes["POST /study-sessions/s1/heartbeat"] = () => ({ session: session() });
      routes["POST /study-sessions/s1/pause"] = () => new ApiError(0, "network_error", "down");
      await mount();
      await tick(180_000);
      expect(calls("POST /study-sessions/s1/pause")).toHaveLength(1);
      expect(screen.queryByRole("dialog")).toBeNull();
      // 5 periodic beats + the final beat of the pause attempt + the fallback beat
      expect(calls("POST /study-sessions/s1/heartbeat")).toHaveLength(7);
      await tick(30_000);
      expect(calls("POST /study-sessions/s1/pause")).toHaveLength(2);
    });

    it("clears a stale error text when the user acts again", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session() });
      routes["POST /study-sessions/s1/heartbeat"] = () => ({ session: session() });
      routes["POST /study-sessions/s1/pause"] = () => new ApiError(500, "internal", "boom");
      await mount();
      await userEvent.click(btn("Pause"));
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn't pause");
      routes["POST /study-sessions/s1/pause"] = () => ({ session: session({ status: "paused" }) });
      await userEvent.click(btn("Pause"));
      expect(screen.queryByText(/Couldn't pause/)).toBeNull();
    });

    it("pause sends a final heartbeat first, then pauses; resume likewise", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session() });
      routes["POST /study-sessions/s1/heartbeat"] = () => ({ session: session({ activeSeconds: 12 }) });
      routes["POST /study-sessions/s1/pause"] = () => ({ session: session({ status: "paused", activeSeconds: 12 }) });
      routes["POST /study-sessions/s1/resume"] = () => ({ session: session({ activeSeconds: 12 }) });
      await mount();
      await userEvent.click(btn("Pause"));
      const order = apiFetch.mock.calls.map(([p]) => p).filter((p) => /heartbeat|pause|resume/.test(p));
      expect(order).toEqual(["/study-sessions/s1/heartbeat", "/study-sessions/s1/pause"]);
      expect(btn("Resume")).toBeInTheDocument();
      await userEvent.click(btn("Resume"));
      const order2 = apiFetch.mock.calls.map(([p]) => p).filter((p) => /heartbeat|pause|resume/.test(p));
      expect(order2.slice(2)).toEqual(["/study-sessions/s1/heartbeat", "/study-sessions/s1/resume"]);
    });

    it("3 minutes of silence pauses the session and asks 'Still studying?'; Resume resumes", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session() });
      routes["POST /study-sessions/s1/heartbeat"] = () => ({ session: session() });
      routes["POST /study-sessions/s1/pause"] = () => ({ session: session({ status: "paused" }) });
      routes["POST /study-sessions/s1/resume"] = () => ({ session: session() });
      await mount();
      await tick(179_000);
      expect(calls("POST /study-sessions/s1/pause")).toHaveLength(0);
      await tick(1_000);
      expect(calls("POST /study-sessions/s1/pause")).toHaveLength(1);
      const dlg = screen.getByRole("dialog", { name: "Still studying?" });
      await userEvent.click(within(dlg).getByRole("button", { name: "Resume" }));
      expect(calls("POST /study-sessions/s1/resume")).toHaveLength(1);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("end", () => {
    const run = async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session({ taskId: "t1", activeSeconds: 1600, plannedMin: 25 }) });
      routes["POST /study-sessions/s1/heartbeat"] = () => ({ session: session({ taskId: "t1", activeSeconds: 1600, plannedMin: 25 }) });
      routes["POST /study-sessions/s1/end"] = () => ({ session: session({ status: "ended" }) });
      await mount();
      await userEvent.click(btn("End"));
      return screen.getByRole("dialog", { name: "End study session" });
    };
    it("shows a summary and omits completeTask unless ticked", async () => {
      const dlg = await run();
      expect(dlg).toHaveTextContent("26:40");
      expect(dlg).toHaveTextContent("Target reached");
      await userEvent.click(within(dlg).getByRole("radio", { name: "4" }));
      await userEvent.type(within(dlg).getByLabelText("Notes"), "good");
      await userEvent.click(within(dlg).getByRole("button", { name: "End session" }));
      expect(bodyOf(calls("POST /study-sessions/s1/end")[0])).toEqual({ focusRating: 4, notes: "good" });
      expect(screen.getByText("No active session")).toBeInTheDocument();
    });
    it("sends completeTask: true when ticked", async () => {
      const dlg = await run();
      await userEvent.click(within(dlg).getByRole("checkbox", { name: "Mark linked task complete" }));
      await userEvent.click(within(dlg).getByRole("button", { name: "End session" }));
      expect(bodyOf(calls("POST /study-sessions/s1/end")[0])).toEqual({ completeTask: true });
    });
    it("shows the server's value (after a final heartbeat) for time studied and target", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session({ activeSeconds: 1600, plannedMin: 26 }) });
      routes["POST /study-sessions/s1/heartbeat"] = () => ({ session: session({ activeSeconds: 1500, plannedMin: 26 }) });
      await mount();
      await userEvent.click(btn("End"));
      const dlg = screen.getByRole("dialog", { name: "End study session" });
      expect(bodyOf(calls("POST /study-sessions/s1/heartbeat")[0])).toEqual({ interacted: true });
      expect(dlg).toHaveTextContent("25:00");
      expect(dlg).toHaveTextContent("Not reached");
    });
    it("a session already finished in another tab: resyncs, closes the dialog and says so", async () => {
      const dlg = await run();
      routes["POST /study-sessions/s1/end"] = () => new ApiError(409, "invalid_state", "x");
      routes["GET /study-sessions/active"] = () => ({ session: null });
      await userEvent.click(within(dlg).getByRole("button", { name: "End session" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByText("This session was already finished")).toBeInTheDocument();
      expect(screen.getByText("No active session")).toBeInTheDocument();
    });
    it("conflict: the other session was already finished elsewhere -> notice and resync", async () => {
      const other = session({ id: "s0" });
      routes["POST /study-sessions"] = () => new ApiError(409, "session_conflict", "x", { active: other });
      routes["POST /study-sessions/s0/heartbeat"] = () => ({ session: other });
      routes["POST /study-sessions/s0/end"] = () => new ApiError(404, "not_found", "x");
      await mount();
      await userEvent.click(btn("Study session"));
      await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Start" }));
      const before = calls("GET /study-sessions/active").length;
      await userEvent.click(btn("End it and start new"));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByText("This session was already finished")).toBeInTheDocument();
      expect(calls("GET /study-sessions/active").length).toBe(before + 1);
    });
    it("hides the checkbox when no task is linked", async () => {
      routes["GET /study-sessions/active"] = () => ({ session: session() });
      routes["POST /study-sessions/s1/heartbeat"] = () => ({ session: session() });
      await mount();
      await userEvent.click(btn("End"));
      expect(screen.queryByRole("checkbox")).toBeNull();
    });
  });

  it("shows a retry banner when loading the active session fails", async () => {
    routes["GET /study-sessions/active"] = () => new ApiError(0, "network_error", "down");
    await mount();
    expect(screen.getByText(/couldn.t load your session/i)).toBeInTheDocument();
    routes["GET /study-sessions/active"] = () => ({ session: session() });
    await userEvent.click(btn("Retry"));
    expect(screen.getByRole("timer")).toBeInTheDocument();
  });
});
