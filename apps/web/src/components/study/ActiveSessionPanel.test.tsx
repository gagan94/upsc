import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "../planner/user-shim";
import type { StudySessionApi } from "./StudySessionProvider";

const api = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("./StudySessionProvider", () => ({ useOptionalStudySession: () => api.current }));

import { ActiveSessionPanel } from "./ActiveSessionPanel";

const base = {
  session: { id: "s", status: "running", plannedMin: 25, startedAt: "", activeSeconds: 0, pausedSeconds: 0, taskId: null, subjectNodeId: null, stale: false },
  seconds: 750,
  pause: vi.fn(),
  resume: vi.fn(),
  openEnd: vi.fn(),
  discard: vi.fn(),
} as unknown as StudySessionApi;

describe("ActiveSessionPanel", () => {
  it("renders nothing without an active session", () => {
    api.current = { ...base, session: null };
    const { container } = render(<ActiveSessionPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows time and progress, and discarding needs a second click", async () => {
    api.current = base;
    render(<ActiveSessionPanel />);
    expect(screen.getByText("12:30")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(base.discard).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirm discard" }));
    expect(base.discard).toHaveBeenCalledTimes(1);
  });
});
