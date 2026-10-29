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

  it.each(["week", "month", "goals"])("%s is a labelled placeholder", async (view) => {
    render(await PlannerPage({ searchParams: Promise.resolve({ view }) }));
    expect(screen.getByText("Coming in the next step")).toBeInTheDocument();
  });

  it("falls back to today for an unknown view", async () => {
    render(await PlannerPage({ searchParams: Promise.resolve({ view: "zzz" }) }));
    expect(screen.getByRole("tab", { name: "Today" })).toHaveAttribute("aria-selected", "true");
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
