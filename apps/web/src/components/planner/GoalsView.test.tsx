import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "./user-shim";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { GoalsView as Goals, ProgressView } from "@/lib/types";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));

import { GoalsView } from "./GoalsView";

const POLITY = "11111111-1111-4111-8111-111111111111";
const HISTORY = "22222222-2222-4222-8222-222222222222";
// Catalog subject ids differ from the syllabus node ids that goals are keyed by.
const subjects = [
  { id: "cat-polity", syllabusNodeId: POLITY, title: "Polity" },
  { id: "cat-history", syllabusNodeId: HISTORY, title: "History" },
];
const OTHER = "33333333-3333-4333-8333-333333333333";
const goals: Goals = { dailyMin: 120, weeklyMin: 600, monthlyMilestone: "Finish Polity", milestoneDate: "2026-10-31", subjectTargets: [{ subjectNodeId: POLITY, weeklyMin: 180 }] };
const progress: ProgressView = {
  weekStart: "2026-10-12",
  days: [],
  totals: { recordedMin: 300, plannedMin: 600, goalMin: 600, tasksDone: 3, tasksTotal: 4 },
  subjects: [{ subjectNodeId: POLITY, title: "Polity", plannedMin: 120, recordedMin: 90, targetMin: 180 }],
};

const view = () => render(<GoalsView goals={goals} progress={progress} subjects={subjects} />);
const num = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const setValue = async (el: HTMLElement, v: string) => {
  await userEvent.clear(el);
  await userEvent.type(el, v);
};

beforeEach(() => {
  apiFetch.mockReset();
});

describe("GoalsView", () => {
  it("shows the current goals and progress", () => {
    view();
    expect(num("Daily goal (minutes)").value).toBe("120");
    expect(num("Weekly goal (minutes)").value).toBe("600");
    expect(screen.getByLabelText("Monthly milestone")).toHaveValue("Finish Polity");
    expect(screen.getByLabelText("Milestone date")).toHaveValue("2026-10-31");
    expect(screen.getByRole("progressbar", { name: "Study time this week" })).toBeInTheDocument();
    expect(screen.getByText(/Recorded work only/)).toBeInTheDocument();
  });

  it("rejects a daily goal above the weekly goal without calling the API", async () => {
    view();
    await setValue(num("Daily goal (minutes)"), "700");
    await userEvent.click(screen.getByRole("button", { name: "Save goals" }));
    expect(screen.getByText("Daily goal cannot be more than the weekly goal")).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("rejects non-numeric or out-of-range minutes", async () => {
    view();
    await setValue(num("Weekly goal (minutes)"), "99999");
    await userEvent.click(screen.getByRole("button", { name: "Save goals" }));
    expect(screen.getByText("Enter whole minutes between 1 and 10080")).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("saves goals and updates the progress goal text", async () => {
    apiFetch.mockResolvedValue({ goals: { ...goals, weeklyMin: 300, dailyMin: 60 } });
    view();
    await setValue(num("Daily goal (minutes)"), "60");
    await setValue(num("Weekly goal (minutes)"), "300");
    await userEvent.click(screen.getByRole("button", { name: "Save goals" }));
    expect(apiFetch).toHaveBeenCalledWith(
      "/planner/goals",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ dailyMin: 60, weeklyMin: 300, monthlyMilestone: "Finish Polity", milestoneDate: "2026-10-31" }),
      }),
    );
    expect(await screen.findByText("Goals saved")).toBeInTheDocument();
    expect(screen.getByText("5h of 5h (100%)")).toBeInTheDocument();
  });

  it("clears the milestone by sending nulls", async () => {
    apiFetch.mockResolvedValue({ goals: { ...goals, monthlyMilestone: null, milestoneDate: null } });
    view();
    await setValue(screen.getByLabelText("Monthly milestone"), "");
    await setValue(screen.getByLabelText("Milestone date"), "");
    await userEvent.click(screen.getByRole("button", { name: "Save goals" }));
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({ monthlyMilestone: null, milestoneDate: null });
  });

  it("shows the API message on a 400", async () => {
    apiFetch.mockImplementation(async () => {
      throw new ApiError(400, "validation_failed", "dailyMin must not exceed weeklyMin");
    });
    view();
    await userEvent.click(screen.getByRole("button", { name: "Save goals" }));
    expect(await screen.findByText("dailyMin must not exceed weeklyMin")).toBeInTheDocument();
  });

  it("shows a generic error on network failure", async () => {
    apiFetch.mockImplementation(async () => {
      throw new ApiError(0, "network_error", "Network request failed");
    });
    view();
    await userEvent.click(screen.getByRole("button", { name: "Save goals" }));
    expect(await screen.findByText("We couldn't save your goals. Please try again.")).toBeInTheDocument();
  });

  it("edits weekly subject targets", async () => {
    apiFetch.mockResolvedValue({ goals: { ...goals, subjectTargets: [{ subjectNodeId: POLITY, weeklyMin: 180 }, { subjectNodeId: HISTORY, weeklyMin: 60 }] } });
    view();
    expect(screen.queryByLabelText("Weekly target for History (minutes)")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Edit weekly subject targets" }));
    expect(num("Weekly target for Polity (minutes)").value).toBe("180");
    await setValue(num("Weekly target for History (minutes)"), "60");
    await userEvent.click(screen.getByRole("button", { name: "Save targets" }));
    expect(apiFetch).toHaveBeenCalledWith(
      "/planner/goals",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ subjectTargets: [{ subjectNodeId: POLITY, weeklyMin: 180 }, { subjectNodeId: HISTORY, weeklyMin: 60 }] }),
      }),
    );
    expect(await screen.findByText("Targets saved")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("progressbar", { name: "History weekly target" })).toBeInTheDocument());
  });

  it("keeps saved targets for subjects not listed in the form", async () => {
    const withOther: Goals = { ...goals, subjectTargets: [{ subjectNodeId: POLITY, weeklyMin: 180 }, { subjectNodeId: OTHER, weeklyMin: 420 }] };
    apiFetch.mockResolvedValue({ goals: { ...withOther, subjectTargets: [{ subjectNodeId: POLITY, weeklyMin: 200 }, { subjectNodeId: OTHER, weeklyMin: 420 }] } });
    render(<GoalsView goals={withOther} progress={progress} subjects={subjects} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit weekly subject targets" }));
    await setValue(num("Weekly target for Polity (minutes)"), "200");
    await userEvent.click(screen.getByRole("button", { name: "Save targets" }));
    expect(apiFetch).toHaveBeenCalledWith(
      "/planner/goals",
      expect.objectContaining({ body: JSON.stringify({ subjectTargets: [{ subjectNodeId: POLITY, weeklyMin: 200 }, { subjectNodeId: OTHER, weeklyMin: 420 }] }) }),
    );
    expect(await screen.findByText("Targets saved")).toBeInTheDocument();
  });

  it("blanking a target removes it; invalid minutes are rejected", async () => {
    apiFetch.mockResolvedValue({ goals: { ...goals, subjectTargets: [] } });
    view();
    await userEvent.click(screen.getByRole("button", { name: "Edit weekly subject targets" }));
    await setValue(num("Weekly target for History (minutes)"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Save targets" }));
    expect(screen.getByText("Enter whole minutes between 1 and 10080")).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
    await setValue(num("Weekly target for History (minutes)"), "");
    await setValue(num("Weekly target for Polity (minutes)"), "");
    await userEvent.click(screen.getByRole("button", { name: "Save targets" }));
    expect(apiFetch).toHaveBeenCalledWith("/planner/goals", expect.objectContaining({ body: JSON.stringify({ subjectTargets: [] }) }));
  });
});
