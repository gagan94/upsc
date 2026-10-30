import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBars, percentOf } from "./ProgressBars";
import type { ProgressView } from "@/lib/types";

const progress = (o: Partial<ProgressView["totals"]> = {}, subjects: ProgressView["subjects"] = []): ProgressView => ({
  weekStart: "2026-10-12",
  days: [],
  totals: { recordedMin: 300, plannedMin: 600, goalMin: 600, tasksDone: 3, tasksTotal: 4, ...o },
  subjects,
});

describe("percentOf", () => {
  it("rounds, floors at 0 and survives a zero goal", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(-5, 10)).toBe(0);
    expect(percentOf(150, 100)).toBe(150);
  });
});

describe("ProgressBars", () => {
  it("shows study time vs goal and tasks done vs total", () => {
    render(<ProgressBars progress={progress()} />);
    const study = screen.getByRole("progressbar", { name: "Study time this week" });
    expect(study).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("5h of 10h (50%)")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Tasks done this week" })).toHaveAttribute("aria-valuenow", "75");
    expect(screen.getByText("3 of 4 tasks (75%)")).toBeInTheDocument();
  });

  it("caps the bar at 100% but shows the real value in text", () => {
    render(<ProgressBars progress={progress({ recordedMin: 900, goalMin: 600 })} />);
    const bar = screen.getByRole("progressbar", { name: "Study time this week" });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar.firstElementChild).toHaveStyle({ width: "100%" });
    expect(screen.getByText("15h of 10h (150%)")).toBeInTheDocument();
  });

  it("handles no tasks planned", () => {
    render(<ProgressBars progress={progress({ tasksDone: 0, tasksTotal: 0 })} />);
    expect(screen.getByText("0 of 0 tasks (0%)")).toBeInTheDocument();
  });

  it("lists subjects with planned, recorded and target", () => {
    render(
      <ProgressBars
        progress={progress({}, [
          { subjectNodeId: "s1", title: "Polity", plannedMin: 120, recordedMin: 90, targetMin: 180 },
          { subjectNodeId: "s2", title: "History", plannedMin: 60, recordedMin: 0, targetMin: null },
        ])}
      />,
    );
    expect(screen.getByRole("progressbar", { name: "Polity weekly target" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("Planned 2h · Recorded 1h 30m · Target 3h (50%)")).toBeInTheDocument();
    expect(screen.getByText("Planned 1h · Recorded 0m · No target")).toBeInTheDocument();
  });

  it("states what counts as study time", () => {
    render(<ProgressBars progress={progress()} />);
    expect(screen.getByText("Recorded work only: skipped tasks and unrecorded timer sessions do not add study time")).toBeInTheDocument();
  });
});
