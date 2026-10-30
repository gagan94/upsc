import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => {
    throw new Error(`NEXT_REDIRECT:${u}`);
  },
}));
vi.mock("@/components/study/ActiveSessionPanel", () => ({ ActiveSessionPanel: () => <div data-testid="panel" /> }));

import SessionsPage from "./page";

beforeEach(() => {
  serverApi.mockReset();
});

describe("sessions history page", () => {
  it("renders ended sessions with the active panel", async () => {
    serverApi.mockImplementation(async (path: string) => {
      if (path === "/me/profile") return { timezone: "Asia/Kolkata" };
      if (path === "/study-sessions?limit=50")
        return { sessions: [{ id: "a", status: "ended", plannedMin: 25, startedAt: "2026-10-14T04:30:00.000Z", activeSeconds: 1500, pausedSeconds: 0, taskId: null, subjectNodeId: "n1", stale: false, focusRating: 5 }] };
      if (path === "/learn/subjects") return { subjects: [{ id: "n1", title: "Polity" }] };
      throw new Error(path);
    });
    render(await SessionsPage());
    expect(screen.getByRole("heading", { name: "Study sessions" })).toBeInTheDocument();
    expect(screen.getByTestId("panel")).toBeInTheDocument();
    expect(screen.getByText("Polity")).toBeInTheDocument();
  });

  it("shows an error state with retry when the API fails", async () => {
    serverApi.mockRejectedValue(new ApiError(500, "internal", "x"));
    render(await SessionsPage());
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/planner/sessions");
  });

  it("redirects to login when unauthenticated", async () => {
    serverApi.mockRejectedValue(new ApiError(401, "unauthenticated", "x"));
    await expect(SessionsPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});
