import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@/components/planner/user-shim";
import { ApiError } from "@/lib/api";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RESULTS_SESSION_ID, review } from "./review-fixtures";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));

import { BookmarkButton } from "./BookmarkButton";
import { OthersAnswered } from "./OthersAnswered";
import { ReasoningBox } from "./ReasoningBox";
import { ReportIssueDialog } from "./ReportIssueDialog";
import { ReviewPanel } from "./ReviewPanel";

beforeEach(() => {
  apiFetch.mockReset();
});

describe("OthersAnswered", () => {
  it("says Not enough data yet for null percentages", () => {
    render(<OthersAnswered data={{ sample: 10, pctByOption: null }} />);
    expect(screen.getByText("Not enough data yet")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("draws bars whose width equals the percent", () => {
    render(<OthersAnswered data={{ sample: 200, pctByOption: { A: 50, B: 33.3, C: 16.7, D: 0 } }} />);
    expect(screen.getByTestId("others-bar-A")).toHaveStyle({ width: "50%" });
    expect(screen.getByTestId("others-bar-B")).toHaveStyle({ width: "33.3%" });
    expect(screen.getByText("33.3%")).toBeInTheDocument();
    expect(screen.getByTestId("others-bar-D")).toHaveStyle({ width: "0%" });
  });
});

describe("BookmarkButton", () => {
  it("flips immediately and PUTs", async () => {
    let done!: () => void;
    apiFetch.mockReturnValue(new Promise((r) => (done = () => r({ bookmarked: true }))));
    render(<BookmarkButton questionId="q-1" initial={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Bookmark question" }));
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
    expect(apiFetch).toHaveBeenCalledWith("/practice/questions/q-1/bookmark", { method: "PUT" });
    done();
  });
  it("uses DELETE to remove", async () => {
    apiFetch.mockResolvedValue({ bookmarked: false });
    render(<BookmarkButton questionId="q-1" initial />);
    await userEvent.click(screen.getByRole("button", { name: "Remove bookmark" }));
    expect(apiFetch).toHaveBeenCalledWith("/practice/questions/q-1/bookmark", { method: "DELETE" });
    expect(screen.getByRole("button", { name: "Bookmark question" })).toBeInTheDocument();
  });
  it("reverts and tells the user when the request fails", async () => {
    apiFetch.mockImplementation(async () => {
      throw new ApiError(500, "internal", "x");
    });
    render(<BookmarkButton questionId="q-1" initial={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Bookmark question" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't update/i);
    expect(screen.getByRole("button", { name: "Bookmark question" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("BookmarkButton in flight", () => {
  it("ignores a second click while the first request is pending", async () => {
    let done!: () => void;
    apiFetch.mockReturnValue(new Promise((r) => (done = () => r({}))));
    render(<BookmarkButton questionId="q-1" initial={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Bookmark question" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove bookmark" }));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toBeInTheDocument();
    await act(async () => done());
  });
});

describe("ReasoningBox", () => {
  it("saves the note through the reasoning endpoint", async () => {
    apiFetch.mockResolvedValue({ saved: true });
    render(<ReasoningBox sessionId={RESULTS_SESSION_ID} ordinal={2} initial={null} />);
    await userEvent.type(screen.getByLabelText("Analyse my thinking"), "I confused the articles");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(apiFetch).toHaveBeenCalledWith(`/practice/sessions/${RESULTS_SESSION_ID}/questions/2/reasoning`, {
      method: "PUT",
      body: JSON.stringify({ text: "I confused the articles" }),
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });
  it("shows an error when saving fails", async () => {
    apiFetch.mockImplementation(async () => {
      throw new ApiError(500, "internal", "x");
    });
    render(<ReasoningBox sessionId={RESULTS_SESSION_ID} ordinal={2} initial="old" />);
    await userEvent.type(screen.getByLabelText("Analyse my thinking"), "!");
    await userEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't save/i);
  });
});

describe("ReportIssueDialog", () => {
  it("posts the chosen type and text", async () => {
    apiFetch.mockResolvedValue({ id: "r1", status: "open" });
    render(<ReportIssueDialog questionId="q-1" open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("radio", { name: "Typo" }));
    await userEvent.type(screen.getByLabelText("Details (optional)"), "Spelling in option B");
    await userEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect(apiFetch).toHaveBeenCalledWith("/practice/questions/q-1/report", {
      method: "POST",
      body: JSON.stringify({ type: "typo", text: "Spelling in option B" }),
    });
    expect(await screen.findByText(/Thanks, your report was sent/)).toBeInTheDocument();
  });
  it("omits empty text and defaults to the first type", async () => {
    apiFetch.mockResolvedValue({ id: "r1", status: "open" });
    render(<ReportIssueDialog questionId="q-1" open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect(apiFetch).toHaveBeenCalledWith("/practice/questions/q-1/report", { method: "POST", body: JSON.stringify({ type: "wrong_key" }) });
  });
});

describe("ReportIssueDialog reuse", () => {
  it("resets after Thanks so a second report can be filed", async () => {
    apiFetch.mockResolvedValue({ id: "r1", status: "open" });
    function Host() {
      const [o, setO] = useState(true);
      return (
        <>
          <button onClick={() => setO(true)}>again</button>
          <ReportIssueDialog questionId="q-1" open={o} onClose={() => setO(false)} />
        </>
      );
    }
    render(<Host />);
    await userEvent.click(screen.getByRole("radio", { name: "Typo" }));
    await userEvent.type(screen.getByLabelText("Details (optional)"), "first");
    await userEvent.click(screen.getByRole("button", { name: "Send report" }));
    await screen.findByText(/Thanks, your report was sent/);
    await userEvent.click(screen.getAllByRole("button", { name: "Close" })[1]);
    await userEvent.click(screen.getByRole("button", { name: "again" }));
    expect(screen.getByLabelText("Details (optional)")).toHaveValue("");
    expect(screen.getByRole("radio", { name: "Wrong answer key" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Send report" })).toBeInTheDocument();
  });
});

describe("ReviewPanel", () => {
  const show = (r = review(), ordinal = 2, total = 5) =>
    render(<ReviewPanel sessionId={RESULTS_SESSION_ID} questionId="q-2" ordinal={ordinal} total={total} review={r} />);

  it("shows your answer vs the correct answer and the explanations", () => {
    show();
    expect(screen.getByRole("heading", { name: "Question 2 of 5" })).toBeInTheDocument();
    expect(screen.getByText("Sample question")).toBeInTheDocument();
    expect(screen.getByText("Your answer: B")).toBeInTheDocument();
    expect(screen.getByText("Correct answer: A")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Why A is correct" })).toBeInTheDocument();
    expect(screen.getByText("Article 14 guarantees equality before the law.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Why B can feel convincing" })).toBeInTheDocument();
    expect(screen.getByText("Mixing up Articles 14 and 25.")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Option-by-option reasoning" });
    expect(within(list).getByText("That is about religion.")).toBeInTheDocument();
    expect(screen.getByText("Not enough data yet")).toBeInTheDocument();
    expect(screen.getByText("Confidence: Sure")).toBeInTheDocument();
    expect(screen.getByText("Time spent: 0:42")).toBeInTheDocument();
  });

  it("handles a skipped question and no misconception", () => {
    show(review({ yourAnswer: null, correct: null, timeMs: 0, misconception: null, confidence: null, isSample: false } as never));
    expect(screen.getByText("Your answer: Skipped")).toBeInTheDocument();
    expect(screen.getByText("Time spent: —")).toBeInTheDocument();
    expect(screen.queryByText(/Incorrect/)).toBeNull();
    expect(screen.queryByText(/can feel convincing/)).toBeNull();
  });

  it("renders question text as plain text", () => {
    const r = review();
    show({ ...r, question: { ...r.question, stem: "<img src=x onerror=alert(1)>" } });
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("links previous and next, hiding them at the ends", () => {
    const { unmount } = show();
    expect(screen.getByRole("link", { name: "Previous question" })).toHaveAttribute("href", `/prelims/review/${RESULTS_SESSION_ID}/1`);
    expect(screen.getByRole("link", { name: "Next question" })).toHaveAttribute("href", `/prelims/review/${RESULTS_SESSION_ID}/3`);
    unmount();
    show(review(), 1, 5);
    expect(screen.queryByRole("link", { name: "Previous question" })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to results" })).toHaveAttribute("href", `/prelims/results/${RESULTS_SESSION_ID}`);
  });

  it("opens the report dialog", async () => {
    show();
    await userEvent.click(screen.getByRole("button", { name: "Report an issue" }));
    expect(screen.getByRole("dialog", { name: "Report an issue" })).toBeInTheDocument();
  });
});
