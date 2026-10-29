import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { OnboardingView } from "@/lib/types";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/api")>()),
  apiFetch: (...a: unknown[]) => apiFetch(...a),
}));

import { Wizard } from "./Wizard";

const subjects = [
  { id: "s1", slug: "polity", title: "Polity", gsPaper: "GS2", moduleCount: 1, lessonCount: 1 },
  { id: "s2", slug: "history", title: "History", gsPaper: "GS1", moduleCount: 1, lessonCount: 1 },
];
const previewTasks = [
  { title: "Read Polity", activityType: "reading", durationMin: 60, scheduledStart: "2026-11-02T12:30:00.000Z" },
  { title: "Practise History", activityType: "practice_mcq", durationMin: 30, scheduledStart: "2026-11-02T14:00:00.000Z" },
  { title: "Starter revision: review your notes", activityType: "revision", durationMin: 45, scheduledStart: "2026-11-03T12:30:00.000Z" },
];

let onboarding: OnboardingView;
let putError: ApiError | null;

function route(path: string, init?: RequestInit) {
  const method = init?.method ?? "GET";
  if (path === "/me/onboarding" && method === "GET") return Promise.resolve(onboarding);
  if (path === "/learn/subjects") return Promise.resolve({ subjects });
  if (path === "/me/profile") return Promise.resolve({ name: "A", email: "a@x.co", bio: null, location: null, timezone: "Asia/Kolkata" });
  if (path === "/me/onboarding" && method === "PUT") {
    if (putError) return Promise.reject(putError);
    const body = JSON.parse(init!.body as string);
    return Promise.resolve({ status: body.status ?? "in_progress", step: body.step, answers: body.answers });
  }
  if (path === "/me/onboarding/plan-preview") return Promise.resolve({ tasks: previewTasks });
  if (path === "/me/onboarding/complete") return Promise.resolve({ createdTasks: 3 });
  return Promise.reject(new Error(`unexpected ${method} ${path}`));
}
const puts = () =>
  apiFetch.mock.calls.filter((c) => c[0] === "/me/onboarding" && c[1]?.method === "PUT").map((c) => JSON.parse(c[1].body));
const calls = (path: string) => apiFetch.mock.calls.filter((c) => c[0] === path);

async function load() {
  render(<Wizard />);
  await screen.findByRole("heading", { level: 1 });
}
const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));

async function completeStep1() {
  fireEvent.click(screen.getByRole("radio", { name: "2027" }));
  fireEvent.click(screen.getByRole("radio", { name: "Preparing" }));
  next();
  await screen.findByRole("heading", { name: "Your focus" });
}
async function completeStep2() {
  fireEvent.click(screen.getByRole("radio", { name: "Prelims" }));
  fireEvent.click(await screen.findByRole("button", { name: "Polity" }));
  next();
  await screen.findByRole("heading", { name: "Your routine" });
}
async function completeStep3() {
  next();
  await screen.findByRole("heading", { name: "Support you want" });
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(route);
  replace.mockReset();
  push.mockReset();
  putError = null;
  onboarding = { status: "not_started", step: 0, answers: {} };
});

describe("Wizard step 1", () => {
  it("does not advance until target year and stage are chosen", async () => {
    await load();
    expect(screen.getByRole("heading", { name: "Your preparation" })).toBeInTheDocument();
    next();
    expect(screen.getByText("Choose a target year")).toBeInTheDocument();
    expect(screen.getByText("Choose your stage")).toBeInTheDocument();
    expect(puts()).toHaveLength(0);
    fireEvent.click(screen.getByRole("radio", { name: "Just exploring" }));
    next();
    expect(puts()).toHaveLength(0);
    fireEvent.click(screen.getByRole("radio", { name: "Preparing" }));
    next();
    await screen.findByRole("heading", { name: "Your focus" });
    expect(puts()).toEqual([{ step: 1, status: "in_progress", answers: { targetYear: null, stage: "preparing", attempt: null } }]);
  });
  it("offers Prefer not to say for the optional attempt", async () => {
    await load();
    fireEvent.change(screen.getByLabelText("Attempt (optional)"), { target: { value: "prefer_not_to_say" } });
    fireEvent.click(screen.getByRole("radio", { name: "2028" }));
    fireEvent.click(screen.getByRole("radio", { name: "Revision" }));
    next();
    await screen.findByRole("heading", { name: "Your focus" });
    expect(puts()[0].answers).toEqual({ targetYear: 2028, stage: "revision", attempt: "prefer_not_to_say" });
  });
});

describe("Wizard steps 2-4", () => {
  it("requires papers on the focus step and sends subject slugs", async () => {
    await load();
    await completeStep1();
    next();
    expect(screen.getByText("Choose which papers you are preparing")).toBeInTheDocument();
    expect(puts()).toHaveLength(1);
    await completeStep2();
    expect(puts()[1]).toEqual({ step: 2, status: "in_progress", answers: { focus: { papers: "prelims", subjects: ["polity"] } } });
  });
  it("prefills the weekly goal as 7 x daily and keeps a manual weekly value", async () => {
    await load();
    await completeStep1();
    await completeStep2();
    expect(screen.getByLabelText("Daily study time")).toHaveValue("240");
    expect(screen.getByLabelText("Weekly goal (minutes)")).toHaveValue(1680);
    fireEvent.click(screen.getByRole("radio", { name: "2 hours" }));
    expect(screen.getByLabelText("Weekly goal (minutes)")).toHaveValue(840);
    fireEvent.change(screen.getByLabelText("Weekly goal (minutes)"), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("radio", { name: "3 hours" }));
    expect(screen.getByLabelText("Weekly goal (minutes)")).toHaveValue(600);
  });
  it("requires at least one preferred window and daily <= weekly", async () => {
    await load();
    await completeStep1();
    await completeStep2();
    next();
    expect(screen.getByText("Choose at least one time of day")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Evening" }));
    fireEvent.change(screen.getByLabelText("Weekly goal (minutes)"), { target: { value: "100" } });
    next();
    expect(screen.getByText("Weekly goal must be at least your daily time")).toBeInTheDocument();
    expect(puts()).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Weekly goal (minutes)"), { target: { value: "1680" } });
    next();
    await screen.findByRole("heading", { name: "Support you want" });
    expect(puts()[2]).toEqual({
      step: 3,
      status: "in_progress",
      answers: { routine: { dailyMin: 240, weeklyMin: 1680, windows: ["evening"] } },
    });
  });
  it("Back keeps entered values without saving", async () => {
    await load();
    await completeStep1();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: "2027" })).toHaveAttribute("aria-checked", "true");
    expect(puts()).toHaveLength(1);
  });
  it("support step is optional", async () => {
    await load();
    await completeStep1();
    await completeStep2();
    fireEvent.click(screen.getByRole("button", { name: "Evening" }));
    await completeStep3();
    fireEvent.click(screen.getByRole("button", { name: "Mentor guidance" }));
    next();
    await screen.findByRole("heading", { name: "Review your plan" });
    expect(puts()[3]).toEqual({ step: 4, status: "in_progress", answers: { support: ["mentor"] } });
  });
});

describe("Wizard save-later, skip and failures", () => {
  it("Save and finish later sends in_progress with the current step and leaves", async () => {
    await load();
    await completeStep1();
    fireEvent.click(screen.getByRole("radio", { name: "Mains" }));
    fireEvent.click(screen.getByRole("button", { name: "Save and finish later" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/home"));
    expect(puts()[1]).toEqual({ step: 1, status: "in_progress", answers: { focus: { papers: "mains", subjects: [] } } });
  });
  it("Skip for now saves skipped and leaves", async () => {
    await load();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/home"));
    expect(puts()).toEqual([{ step: 0, status: "skipped", answers: {} }]);
  });
  it("shows a save error, keeps the answers and Retry saves them", async () => {
    await load();
    fireEvent.click(screen.getByRole("radio", { name: "2027" }));
    fireEvent.click(screen.getByRole("radio", { name: "Preparing" }));
    putError = new ApiError(500, "internal", "boom");
    next();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not save your setup");
    expect(screen.getByRole("heading", { name: "Your preparation" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "2027" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Preparing" })).toHaveAttribute("aria-checked", "true");
    putError = null;
    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    await screen.findByRole("heading", { name: "Your focus" });
    expect(puts()).toHaveLength(2);
    expect(puts()[1]).toEqual(puts()[0]);
    expect(screen.queryByText("Could not save your setup")).toBeNull();
  });
  it("a failed skip keeps the user on the page", async () => {
    await load();
    putError = new ApiError(0, "network_error", "down");
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    await screen.findByText("Could not save your setup");
    expect(push).not.toHaveBeenCalled();
  });
});

describe("Wizard loading and resume", () => {
  it("shows an error with Try again when the saved setup cannot be loaded", async () => {
    apiFetch.mockImplementation((p: string, i?: RequestInit) =>
      p === "/me/onboarding" && !i?.method ? Promise.reject(new ApiError(500, "internal", "x")) : route(p, i),
    );
    render(<Wizard />);
    expect(await screen.findByText("We couldn't load your setup")).toBeInTheDocument();
    apiFetch.mockImplementation(route);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Your preparation" })).toBeInTheDocument();
  });
  it("resumes an in-progress setup at the saved step with saved answers", async () => {
    onboarding = {
      status: "in_progress",
      step: 2,
      answers: { targetYear: 2027, stage: "preparing", focus: { papers: "both", subjects: ["polity"] }, routine: { dailyMin: 120, weeklyMin: 700, windows: ["night"] } },
    };
    await load();
    expect(screen.getByRole("heading", { name: "Your routine" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "2 hours" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Weekly goal (minutes)")).toHaveValue(700);
    expect(screen.getByRole("button", { name: "Night" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: "Both" })).toHaveAttribute("aria-checked", "true");
    expect(await screen.findByRole("button", { name: "Polity" })).toHaveAttribute("aria-pressed", "true");
  });
  it("sends a completed user to /home", async () => {
    onboarding = { status: "completed", step: 5, answers: {} };
    render(<Wizard />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });
});

describe("Wizard review", () => {
  async function toReview() {
    onboarding = {
      status: "in_progress",
      step: 4,
      answers: { targetYear: 2027, stage: "preparing", focus: { papers: "prelims" }, routine: { dailyMin: 240, weeklyMin: 1680, windows: ["evening"] } },
    };
    await load();
    await screen.findByText("Read Polity");
  }
  it("previews once, groups tasks by day and shows the total", async () => {
    await toReview();
    expect(calls("/me/onboarding/plan-preview")).toHaveLength(1);
    expect(calls("/me/onboarding/plan-preview")[0][1].method).toBe("POST");
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(2);
    expect(within(groups[0]).getByText("Monday, 2 November 2026")).toBeInTheDocument();
    expect(within(groups[0]).getByText("Read Polity")).toBeInTheDocument();
    expect(within(groups[0]).getByText("Practise History")).toBeInTheDocument();
    expect(within(groups[1]).getByText("Starter revision: review your notes")).toBeInTheDocument();
    expect(screen.getByText(/Total: 2h 15m across 3 tasks/)).toBeInTheDocument();
    expect(calls("/me/onboarding/plan-preview")).toHaveLength(1);
  });
  it("Accept plan and start completes with acceptPlan:true and goes home", async () => {
    await toReview();
    fireEvent.click(screen.getByRole("button", { name: "Accept plan and start" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
    const c = calls("/me/onboarding/complete");
    expect(c).toHaveLength(1);
    expect(c[0][1].method).toBe("POST");
    expect(JSON.parse(c[0][1].body)).toEqual({ acceptPlan: true });
  });
  it("Start with an empty planner completes with acceptPlan:false", async () => {
    await toReview();
    fireEvent.click(screen.getByRole("button", { name: "Start with an empty planner" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
    expect(JSON.parse(calls("/me/onboarding/complete")[0][1].body)).toEqual({ acceptPlan: false });
  });
  it("treats 409 already_completed as done", async () => {
    await toReview();
    apiFetch.mockImplementation((p: string, i?: RequestInit) =>
      p === "/me/onboarding/complete" ? Promise.reject(new ApiError(409, "already_completed", "done")) : route(p, i),
    );
    fireEvent.click(screen.getByRole("button", { name: "Accept plan and start" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });
  it("a failed completion shows the error with Retry and does not navigate", async () => {
    await toReview();
    apiFetch.mockImplementation((p: string, i?: RequestInit) =>
      p === "/me/onboarding/complete" ? Promise.reject(new ApiError(500, "internal", "x")) : route(p, i),
    );
    fireEvent.click(screen.getByRole("button", { name: "Accept plan and start" }));
    expect(await screen.findByText("Could not save your setup")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    apiFetch.mockImplementation(route);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });
  it("shows a preview error with a way back when routine answers are missing", async () => {
    onboarding = { status: "in_progress", step: 4, answers: {} };
    apiFetch.mockImplementation((p: string, i?: RequestInit) =>
      p === "/me/onboarding/plan-preview" ? Promise.reject(new ApiError(400, "onboarding_incomplete", "no routine")) : route(p, i),
    );
    await load();
    expect(await screen.findByText("We couldn't build your plan preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start with an empty planner" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Accept plan and start" })).toBeNull();
  });
  it("shows an empty-preview message and only offers the empty planner", async () => {
    onboarding = { status: "in_progress", step: 4, answers: { routine: { dailyMin: 60, weeklyMin: 420, windows: ["night"] } } };
    apiFetch.mockImplementation((p: string, i?: RequestInit) =>
      p === "/me/onboarding/plan-preview" ? Promise.resolve({ tasks: [] }) : route(p, i),
    );
    await load();
    expect(await screen.findByText("We have no starter tasks to suggest yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept plan and start" })).toBeNull();
  });
});
