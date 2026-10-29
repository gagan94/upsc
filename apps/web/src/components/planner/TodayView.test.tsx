import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "./user-shim";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { TodayView } from "./TodayView";
import { subjects, task, today } from "./fixtures";

beforeEach(() => {
  apiFetch.mockReset();
  push.mockReset();
});

const view = (t = today(), unscheduled = [task({ id: "u1", title: "Backlog item", scheduledStart: null })]) =>
  render(<TodayView today={t} unscheduled={unscheduled} subjects={subjects} tz="Asia/Kolkata" />);

describe("TodayView", () => {
  it("shows stat tiles and groups", () => {
    view(today({ tasks: [task(), task({ id: "t2", title: "Done one", status: "completed" })] }));
    expect(screen.getByText("Planned study")).toBeInTheDocument();
    expect(screen.getByText("Recorded study")).toBeInTheDocument();
    expect(screen.getByText("Tasks completed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "To do" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Completed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suggest weekly plan" })).toBeDisabled();
    expect(screen.getByText("Arrives in Phase 3")).toBeInTheDocument();
  });

  it("overdue banner only when overdue.length > 0", () => {
    const { unmount } = view();
    expect(screen.queryByText("Reschedule, skip or complete")).toBeNull();
    unmount();
    view(today({ overdue: [task({ id: "o1", title: "Old", scheduledStart: "2026-10-12T04:30:00.000Z" })] }));
    expect(screen.getByText("Reschedule, skip or complete")).toBeInTheDocument();
  });

  it("overload banner from overloaded", () => {
    const { unmount } = view();
    expect(screen.queryByText(/overloaded/i)).toBeNull();
    unmount();
    view(today({ overloaded: true }));
    expect(screen.getByText(/overloaded/i)).toBeInTheDocument();
  });

  it("empty state offers Add a task and Open backlog", () => {
    view(today({ tasks: [], stats: { plannedMin: 0, recordedMin: 0, completed: 0, total: 0 } }));
    expect(screen.getByText("No tasks today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a task" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open backlog" })).toHaveAttribute("href", "/planner?view=backlog");
  });

  it("completing optimistically moves the task to Completed", async () => {
    let resolve!: (v: unknown) => void;
    apiFetch.mockReturnValue(new Promise((r) => (resolve = r)));
    view();
    await userEvent.click(screen.getByRole("button", { name: "Mark Read Laxmikanth ch 3 complete" }));
    const done = screen.getByRole("region", { name: "Completed" });
    expect(within(done).getByText("Read Laxmikanth ch 3")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/planner/tasks/t1/complete", expect.objectContaining({ method: "POST" }));
    resolve({ task: task({ status: "completed", completedAt: "2026-10-14T05:00:00.000Z" }) });
    await waitFor(() => expect(within(done).getByText("Read Laxmikanth ch 3")).toBeInTheDocument());
    expect(screen.queryByText("Task save failed")).toBeNull();
  });

  it("rolls back and shows a banner when the API rejects", async () => {
    apiFetch.mockRejectedValue(new ApiError(500, "internal", "boom"));
    view();
    await userEvent.click(screen.getByRole("button", { name: "Mark Read Laxmikanth ch 3 complete" }));
    expect(await screen.findByText("Task save failed")).toBeInTheDocument();
    const todo = screen.getByRole("region", { name: "To do" });
    expect(within(todo).getByText("Read Laxmikanth ch 3")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Completed" })).toBeNull();
  });

  it("rail Schedule reschedules a backlog task", async () => {
    apiFetch.mockResolvedValue({ task: task({ id: "u1", title: "Backlog item", scheduledStart: "2026-10-14T03:30:00.000Z" }) });
    view();
    await userEvent.click(screen.getByRole("button", { name: "Schedule Backlog item" }));
    await userEvent.click(screen.getByRole("button", { name: "Schedule task" }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/planner/tasks/u1/reschedule",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ scheduledStart: "2026-10-14T03:30:00.000Z" }) }),
      ),
    );
  });

  it("delete offers Undo that recreates via POST", async () => {
    apiFetch.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ task: task({ id: "t9" }) });
    view();
    await userEvent.click(screen.getByRole("button", { name: /Actions for Read/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(await screen.findByRole("button", { name: "Undo" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Read Laxmikanth ch 3")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenLastCalledWith("/planner/tasks", expect.objectContaining({ method: "POST" }));
  });
});
