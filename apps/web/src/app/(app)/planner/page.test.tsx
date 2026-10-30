import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { subjects as subs, task, today } from "@/components/planner/fixtures";

const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u), useRouter: () => ({ push: vi.fn() }) }));

import PlannerPage from "./page";

const route = (path: string) => {
  if (path === "/me/profile") return { name: "A", email: "a@b.c", bio: null, location: null, timezone: "Asia/Kolkata" };
  if (path.startsWith("/planner/today")) return today();
  if (path === "/planner/unscheduled") return { tasks: [task({ id: "u1", title: "Backlog item", scheduledStart: null })] };
  if (path === "/learn/subjects") return { subjects: subs.map((s) => ({ ...s, slug: "p", gsPaper: "GS II", moduleCount: 1, lessonCount: 1 })) };
  if (path === "/me/study-preferences") return { dailyGoalMin: 120, weeklyGoalMin: 600, windows: [], weekStart: "monday", defaultSessionMin: 45, remindersEnabled: false };
  if (path.startsWith("/planner/range")) return { tasks: [task()] };
  if (path === "/planner/goals")
    return { goals: { dailyMin: 120, weeklyMin: 600, monthlyMilestone: null, milestoneDate: null, subjectTargets: [] } };
  if (path.startsWith("/planner/progress"))
    return {
      weekStart: "2026-10-12",
      days: [],
      totals: { recordedMin: 0, plannedMin: 0, goalMin: 600, tasksDone: 0, tasksTotal: 0 },
      subjects: [],
    };
  throw new Error(path);
};

beforeEach(() => {
  serverApi.mockReset();
  serverApi.mockImplementation(async (p: string) => route(p));
  redirect.mockClear();
});

describe("PlannerPage", () => {
  it("renders Today by default with all five tabs and passes ?date", async () => {
    render(await PlannerPage({ searchParams: Promise.resolve({ date: "2026-10-14" }) }));
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: "Today" })).toHaveAttribute("aria-selected", "true");
    expect(serverApi).toHaveBeenCalledWith("/planner/today?date=2026-10-14");
    expect(screen.getByText("Planned study")).toBeInTheDocument();
  });

  it("ignores a malformed date", async () => {
    render(await PlannerPage({ searchParams: Promise.resolve({ date: "nope" }) }));
    expect(serverApi).toHaveBeenCalledWith("/planner/today");
  });

  it("renders the backlog view", async () => {
    render(await PlannerPage({ searchParams: Promise.resolve({ view: "backlog" }) }));
    expect(screen.getByRole("tab", { name: "Backlog" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Backlog item")).toBeInTheDocument();
  });

  it("renders the week view from the range of the user's week", async () => {
    render(await PlannerPage({ searchParams: Promise.resolve({ view: "week", date: "2026-10-14" }) }));
    expect(serverApi).toHaveBeenCalledWith("/planner/range?from=2026-10-12&to=2026-10-18");
    expect(screen.getByRole("tab", { name: "Week" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /Open Read Laxmikanth ch 3/ })).toBeInTheDocument();
  });

  it("renders the month view for the month of ?date", async () => {
    render(await PlannerPage({ searchParams: Promise.resolve({ view: "month", date: "2026-10-14" }) }));
    expect(serverApi).toHaveBeenCalledWith("/planner/range?from=2026-10-01&to=2026-10-31");
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
  });

  it("renders the goals view with progress for the week", async () => {
    render(await PlannerPage({ searchParams: Promise.resolve({ view: "goals", date: "2026-10-14" }) }));
    expect(serverApi).toHaveBeenCalledWith("/planner/progress?week=2026-10-12");
    expect(screen.getByRole("button", { name: "Save goals" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Study time this week" })).toBeInTheDocument();
  });

  it("falls back to today for an unknown view", async () => {
    render(await PlannerPage({ searchParams: Promise.resolve({ view: "zzz" }) }));
    expect(screen.getByRole("tab", { name: "Today" })).toHaveAttribute("aria-selected", "true");
  });

  it.each(["week", "month", "goals"])("%s shows the error panel with Try again", async (view) => {
    serverApi.mockImplementation(async (p: string) => {
      if (p === "/me/profile") return route(p);
      throw new ApiError(500, "internal", "boom");
    });
    render(await PlannerPage({ searchParams: Promise.resolve({ view }) }));
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", `/planner?view=${view}`);
  });

  it("shows an error panel with Try again", async () => {
    serverApi.mockRejectedValue(new ApiError(500, "internal", "boom"));
    render(await PlannerPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/planner?view=today");
  });

  it("redirects to login on 401", async () => {
    serverApi.mockRejectedValue(new ApiError(401, "unauthenticated", "no"));
    await expect(PlannerPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});
