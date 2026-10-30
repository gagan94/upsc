import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EndedStudySessionView } from "@/lib/types";
import { SessionHistory } from "./SessionHistory";

const s = (o: Partial<EndedStudySessionView> = {}): EndedStudySessionView => ({
  id: "a",
  status: "ended",
  plannedMin: 45,
  startedAt: "2026-10-14T04:30:00.000Z",
  activeSeconds: 2700,
  pausedSeconds: 0,
  taskId: null,
  subjectNodeId: "n1",
  stale: false,
  focusRating: 4,
  ...o,
});

describe("SessionHistory", () => {
  it("lists date, duration, subject and rating", () => {
    render(<SessionHistory sessions={[s(), s({ id: "b", subjectNodeId: null, focusRating: null, activeSeconds: 600 })]} subjects={[{ id: "n1", title: "Polity" }]} tz="Asia/Kolkata" />);
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    const first = within(rows[1]);
    expect(first.getByText("Polity")).toBeInTheDocument();
    expect(first.getByText("45m")).toBeInTheDocument();
    expect(first.getByLabelText("Focus 4 out of 5")).toBeInTheDocument();
    expect(first.getByText(/10:00 am/i)).toBeInTheDocument();
    expect(within(rows[2]).getByText("10m")).toBeInTheDocument();
    expect(within(rows[2]).getAllByText("—")).toHaveLength(2);
  });

  it("shows an empty state", () => {
    render(<SessionHistory sessions={[]} subjects={[]} tz="Asia/Kolkata" />);
    expect(screen.getByText("No study sessions yet")).toBeInTheDocument();
  });
});
