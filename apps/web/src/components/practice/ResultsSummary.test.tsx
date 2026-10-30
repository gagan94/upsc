import { render, screen, within } from "@testing-library/react";
import userEvent from "@/components/planner/user-shim";
import { ApiError } from "@/lib/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RESULTS_SESSION_ID, results } from "./review-fixtures";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { ResultsSummary } from "./ResultsSummary";

const show = (r = results()) => render(<ResultsSummary sessionId={RESULTS_SESSION_ID} data={r} />);
beforeEach(() => {
  apiFetch.mockReset();
  push.mockReset();
});

describe("ResultsSummary", () => {
  it("shows tiles with accuracy as a rounded percentage", () => {
    show();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("3.34")).toBeInTheDocument();
    expect(screen.getByText("22:14")).toBeInTheDocument();
    expect(screen.getByLabelText("Correct")).toHaveTextContent("2");
    expect(screen.getByLabelText("Incorrect")).toHaveTextContent("2");
    expect(screen.getByLabelText("Skipped")).toHaveTextContent("1");
  });

  it("hides the score tile in learning mode", () => {
    show(results({ score: null }));
    expect(screen.getByText("Accuracy only in learning mode")).toBeInTheDocument();
    expect(screen.queryByText("3.34")).toBeNull();
  });

  it("draws topic bars whose width is the topic accuracy", () => {
    show();
    const bar = screen.getByTestId("topic-bar-11111111-1111-4111-8111-111111111111");
    expect(bar).toHaveStyle({ width: "33%" });
    expect(screen.getByText("1 of 3 correct")).toBeInTheDocument();
  });

  it("links Review answers to the first incorrect question, else the first", () => {
    const { unmount } = show();
    expect(screen.getByRole("link", { name: "Review answers" })).toHaveAttribute("href", `/prelims/review/${RESULTS_SESSION_ID}/2`);
    unmount();
    const r = results();
    show(results({ questions: r.questions.map((q) => ({ ...q, correct: true })) }));
    expect(screen.getByRole("link", { name: "Review answers" })).toHaveAttribute("href", `/prelims/review/${RESULTS_SESSION_ID}/1`);
  });

  it("links the mistake notebook and disables See progress", () => {
    show();
    expect(screen.getByRole("link", { name: "Mistake notebook" })).toHaveAttribute("href", "/prelims?tab=mistakes");
    expect(screen.getByRole("button", { name: "See progress" })).toBeDisabled();
    expect(screen.getByText("Arrives in Phase 4")).toBeInTheDocument();
  });

  it("retries as practice and opens the new workspace", async () => {
    apiFetch.mockResolvedValue({ session: { id: "new-id" } });
    show();
    await userEvent.click(screen.getByRole("button", { name: "Retry as practice" }));
    expect(apiFetch).toHaveBeenCalledWith(`/practice/sessions/${RESULTS_SESSION_ID}/retry`, { method: "POST" });
    expect(push).toHaveBeenCalledWith("/prelims/session/new-id");
  });

  it("shows the API message if retry fails and stays put", async () => {
    apiFetch.mockImplementation(async () => {
      throw new ApiError(409, "no_questions", "None of these questions are available any more");
    });
    show();
    await userEvent.click(screen.getByRole("button", { name: "Retry as practice" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("None of these questions are available any more");
    expect(push).not.toHaveBeenCalled();
  });

  it("renders the next study action", () => {
    show();
    const card = screen.getByRole("region", { name: "Next study action" });
    expect(within(card).getByRole("link", { name: "Practise Indian Polity" })).toHaveAttribute("href", "/prelims/new?subject=11111111-1111-4111-8111-111111111111");
  });

  it("links review_mistakes to the mistakes tab", () => {
    show(results({ nextAction: { kind: "review_mistakes", label: "Review your mistakes" } }));
    expect(screen.getByRole("link", { name: "Review your mistakes" })).toHaveAttribute("href", "/prelims?tab=mistakes");
  });

  it("shows see_progress as disabled", () => {
    show(results({ nextAction: { kind: "see_progress", label: "See your progress" } }));
    const card = screen.getByRole("region", { name: "Next study action" });
    expect(within(card).queryByRole("link")).toBeNull();
    expect(within(card).getByText("Arrives in Phase 4")).toBeInTheDocument();
  });
});
