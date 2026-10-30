import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountdownCard } from "./CountdownCard";
import { OnboardingBanner } from "./OnboardingBanner";
import { PracticeCard } from "./PracticeCard";
import { TodaysPlanCard } from "./TodaysPlanCard";
import { WeekCard } from "./WeekCard";
import type { HomeView, TaskView } from "@/lib/types";

const cd = (o: Partial<HomeView["countdown"][number]> = {}) => ({
  exam: "prelims" as const, year: 2027, date: "2027-05-23", daysLeft: 205, illustrative: false, ...o,
});
const task = (i: number): TaskView => ({
  id: `t${i}`, title: `Task ${i}`, subjectNodeId: null, subjectTitle: null, activityType: "reading",
  durationMin: 30, scheduledStart: null, priority: "normal", status: "todo", completedAt: null,
  actualMin: null, source: "manual", linked: null, notes: null,
});
const practice = (o: Partial<HomeView["practice"]> = {}): HomeView["practice"] => ({
  recentSessions: [], mistakesCount: 0, bookmarksCount: 0, ...o,
});

describe("OnboardingBanner", () => {
  it.each(["not_started", "in_progress", "skipped"] as const)("shows for %s", (status) => {
    render(<OnboardingBanner status={status} />);
    expect(screen.getByRole("link", { name: "Finish personalising my workspace" })).toHaveAttribute("href", "/onboarding");
  });
  it("hides for completed", () => {
    const { container } = render(<OnboardingBanner status="completed" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("CountdownCard", () => {
  it("shows days and Illustrative when any date is illustrative", () => {
    render(<CountdownCard countdown={[cd(), cd({ exam: "mains", daysLeft: 300, illustrative: true })]} />);
    expect(screen.getByText(/Prelims: 205 days/)).toBeInTheDocument();
    expect(screen.getByText(/Mains: 300 days/)).toBeInTheDocument();
    expect(screen.getByText(/Illustrative/)).toBeInTheDocument();
  });
  it("omits Illustrative when all dates are confirmed", () => {
    render(<CountdownCard countdown={[cd()]} />);
    expect(screen.queryByText(/Illustrative/)).not.toBeInTheDocument();
  });
  it("says Today for 0 days and 1 day for 1", () => {
    render(<CountdownCard countdown={[cd({ daysLeft: 0 }), cd({ exam: "mains", daysLeft: 1 })]} />);
    expect(screen.getByText(/Prelims: Today/)).toBeInTheDocument();
    expect(screen.getByText(/Mains: 1 day(?!s)/)).toBeInTheDocument();
  });
  it("renders nothing without dates", () => {
    const { container } = render(<CountdownCard countdown={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("TodaysPlanCard", () => {
  it("lists tasks and links to the planner", () => {
    render(<TodaysPlanCard plan={{ done: 1, total: 4, tasks: [task(1), task(2)] }} />);
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.getByText(/1 of 4 complete/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open plan" })).toHaveAttribute("href", "/planner");
  });
  it("uses neutral copy when open tasks are empty but not all are done", () => {
    render(<TodaysPlanCard plan={{ done: 1, total: 3, tasks: [] }} />);
    expect(screen.getByText("No open tasks left for today")).toBeInTheDocument();
    expect(screen.queryByText(/All of today/)).not.toBeInTheDocument();
  });
  it("says all done only when done equals total", () => {
    render(<TodaysPlanCard plan={{ done: 2, total: 2, tasks: [] }} />);
    expect(screen.getByText("All of today's tasks are done.")).toBeInTheDocument();
  });
  it("shows the empty-plan CTA when there are no tasks today", () => {
    render(<TodaysPlanCard plan={{ done: 0, total: 0, tasks: [] }} />);
    expect(screen.getByRole("link", { name: "Add your first task" })).toHaveAttribute("href", "/planner");
  });
});

describe("PracticeCard", () => {
  it("renders accuracy as a percentage, counts and buttons", () => {
    render(
      <PracticeCard
        tz="Asia/Kolkata"
        practice={practice({
          recentSessions: [
            { id: "a", title: "Polity set", accuracy: 0.6, submittedAt: "2026-10-29T10:00:00.000Z" },
            { id: "b", title: "Learning set", accuracy: null, submittedAt: "2026-10-28T10:00:00.000Z" },
          ],
          mistakesCount: 7, bookmarksCount: 2,
        })}
      />,
    );
    expect(screen.getByText("Polity set")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("No accuracy yet")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start practice" })).toHaveAttribute("href", "/prelims/new");
    expect(screen.getByRole("link", { name: "Review mistakes" })).toHaveAttribute("href", "/prelims?tab=mistakes");
  });
  it("handles zero sessions", () => {
    render(<PracticeCard tz="Asia/Kolkata" practice={practice()} />);
    expect(screen.getByText("No practice sets yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start practice" })).toBeInTheDocument();
  });
});

describe("WeekCard", () => {
  it("shows recorded vs goal, tasks and streak", () => {
    render(<WeekCard week={{ recordedMin: 300, goalMin: 600, tasksDone: 3, tasksTotal: 6, streakDays: 4 }} />);
    expect(screen.getByText("5h of 10h goal")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Weekly study goal" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText(/3 of 6 tasks/)).toBeInTheDocument();
    expect(screen.getByText(/4-day streak/)).toBeInTheDocument();
  });
  it("handles no goal", () => {
    render(<WeekCard week={{ recordedMin: 0, goalMin: 0, tasksDone: 0, tasksTotal: 0, streakDays: 0 }} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.getByText("0m studied")).toBeInTheDocument();
    expect(screen.getByText(/No streak yet/)).toBeInTheDocument();
  });
});
