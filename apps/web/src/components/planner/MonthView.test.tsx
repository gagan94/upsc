import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthView } from "./MonthView";
import { task } from "./fixtures";

const view = (tasks = [task()], weekStart: "monday" | "sunday" = "monday") =>
  render(<MonthView year={2026} month={10} weekStart={weekStart} tasks={tasks} tz="Asia/Kolkata" today="2026-10-14" />);

describe("MonthView", () => {
  it("renders the month grid with weekday headers from the week start", () => {
    view();
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    const heads = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(heads[0]).toBe("Mon");
    expect(heads[6]).toBe("Sun");
    expect(screen.getAllByRole("link", { name: /^\d+ October/ })).toHaveLength(31);
  });

  it("starts on Sunday when configured", () => {
    view([], "sunday");
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Sun");
  });

  it("each day links to Today for that date", () => {
    view();
    expect(screen.getByRole("link", { name: /^14 October/ })).toHaveAttribute("href", "/planner?view=today&date=2026-10-14");
  });

  it("shows task counts and load levels by planned minutes", () => {
    view([
      task({ id: "1", scheduledStart: "2026-10-05T04:30:00.000Z", durationMin: 30 }),
      task({ id: "2", scheduledStart: "2026-10-06T04:30:00.000Z", durationMin: 90 }),
      task({ id: "3", scheduledStart: "2026-10-06T06:30:00.000Z", durationMin: 60 }),
      task({ id: "4", scheduledStart: "2026-10-07T04:30:00.000Z", durationMin: 300 }),
      task({ id: "5", scheduledStart: "2026-10-08T04:30:00.000Z", durationMin: 200, status: "skipped" }),
    ]);
    const cell = (d: string) => screen.getByRole("link", { name: new RegExp(`^${d} October`) });
    expect(cell("5")).toHaveAttribute("data-load", "light");
    expect(cell("5")).toHaveAccessibleName(/1 task, 30m planned/);
    expect(cell("6")).toHaveAttribute("data-load", "medium");
    expect(cell("6")).toHaveAccessibleName(/2 tasks, 2h 30m planned/);
    expect(cell("7")).toHaveAttribute("data-load", "heavy");
    expect(cell("8")).toHaveAttribute("data-load", "none"); // skipped adds no load
    expect(cell("9")).toHaveAttribute("data-load", "none");
    expect(within(cell("6")).getByText("2 tasks")).toBeInTheDocument();
  });

  it("counts a 23:30 IST task on the IST day", () => {
    view([task({ id: "late", scheduledStart: "2026-10-14T18:00:00.000Z", durationMin: 30 })]);
    expect(screen.getByRole("link", { name: /^14 October/ })).toHaveAccessibleName(/1 task/);
    expect(screen.getByRole("link", { name: /^15 October/ })).not.toHaveAccessibleName(/1 task/);
  });

  it("marks today and links previous/next month", () => {
    view();
    expect(screen.getByRole("link", { name: /^14 October/ })).toHaveAttribute("aria-current", "date");
    expect(screen.getByRole("link", { name: "Previous month" })).toHaveAttribute("href", "/planner?view=month&date=2026-09-01");
    expect(screen.getByRole("link", { name: "Next month" })).toHaveAttribute("href", "/planner?view=month&date=2026-11-01");
  });
});
