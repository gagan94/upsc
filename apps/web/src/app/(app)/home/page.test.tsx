import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (u: string) => redirect(u),
  useRouter: () => ({ refresh: vi.fn() }),
}));

import HomePage from "./page";

const home = (o: Record<string, unknown> = {}) => ({
  onboarding: { status: "completed", step: 5 },
  countdown: [{ exam: "prelims", year: 2027, date: "2027-05-23", daysLeft: 205, illustrative: true }],
  plan: { done: 0, total: 0, tasks: [] },
  week: { recordedMin: 0, goalMin: 0, tasksDone: 0, tasksTotal: 0, streakDays: 0 },
  practice: { recentSessions: [], mistakesCount: 0, bookmarksCount: 0 },
  ...o,
});

beforeEach(() => {
  serverApi.mockReset();
  redirect.mockClear();
  serverApi.mockImplementation(async (path: string) => {
    if (path === "/me/profile") return { timezone: "Asia/Kolkata" };
    return home();
  });
});

const mockHome = (h: unknown) =>
  serverApi.mockImplementation(async (path: string) => (path === "/me/profile" ? { timezone: "Asia/Kolkata" } : h));

describe("HomePage", () => {
  it("renders live cards, plan chip and Phase 0 sample cards labelled", async () => {
    render(await HomePage());
    expect(serverApi).toHaveBeenCalledWith("/home");
    expect(screen.getByText("Preparation plan")).toBeInTheDocument();
    expect(screen.getByText(/Illustrative/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first task" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Practice" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "This week" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Continue learning" })).toBeInTheDocument();
    expect(screen.getByText(/Sample data/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Finish personalising my workspace" })).not.toBeInTheDocument();
  });

  it("shows the onboarding banner for skipped and no plan chip", async () => {
    mockHome(home({ onboarding: { status: "skipped", step: 2 } }));
    render(await HomePage());
    expect(screen.getByRole("link", { name: "Finish personalising my workspace" })).toBeInTheDocument();
    expect(screen.queryByText("Preparation plan")).not.toBeInTheDocument();
  });

  it("omits the countdown when there are no exam dates", async () => {
    mockHome(home({ countdown: [] }));
    render(await HomePage());
    expect(screen.queryByText(/Prelims:/)).not.toBeInTheDocument();
  });

  it("shows the error panel with retry", async () => {
    serverApi.mockRejectedValue(new ApiError(500, "internal", "boom"));
    render(await HomePage());
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry|try again/i })).toBeInTheDocument();
  });

  it("redirects to login on 401", async () => {
    serverApi.mockRejectedValue(new ApiError(401, "unauthenticated", "no"));
    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});
