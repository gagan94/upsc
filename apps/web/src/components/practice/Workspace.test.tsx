import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { detail, question, SESSION_ID } from "./session-fixtures";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { Workspace } from "./Workspace";
import { AUTOSAVE_DEBOUNCE_MS, RETRY_DELAY_MS } from "./useAutosave";
import type { PracticeSessionDetail } from "@/lib/types";

const RESULTS = `/prelims/results/${SESSION_ID}`;
const putCalls = () => apiFetch.mock.calls.filter((c) => c[1]?.method === "PUT");
const submitCalls = () => apiFetch.mock.calls.filter((c) => c[0] === `/practice/sessions/${SESSION_ID}/submit`);
const lastPutBody = () => JSON.parse(putCalls().at(-1)![1].body);

async function ms(n: number) {
  await act(async () => void (await vi.advanceTimersByTimeAsync(n)));
}
async function press(key: string, target: Element = document.body) {
  await act(async () => void fireEvent.keyDown(target, { key }));
}
async function click(el: Element) {
  await act(async () => void fireEvent.click(el));
}
const radio = (name: RegExp | string) => screen.getByRole("radio", { name });
const renderWs = (d: PracticeSessionDetail = detail(), extra: { note?: string | null; initialOrdinal?: number } = {}) =>
  render(<Workspace initial={d} note={extra.note ?? null} initialOrdinal={extra.initialOrdinal} />);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance", "Date"] });
  apiFetch.mockReset();
  push.mockReset();
  apiFetch.mockImplementation(async (p: string, init?: RequestInit) => {
    if (init?.method === "PUT") return { saved: true };
    if (init?.method === "POST") return {};
    return detail();
  });
});
afterEach(() => vi.useRealTimers());

describe("Workspace header and timer", () => {
  it("shows position, the timer and the question", () => {
    renderWs();
    expect(screen.getByRole("heading", { name: /Question 1 of 4/ })).toBeInTheDocument();
    expect(screen.getByText("22:14 remaining")).toBeInTheDocument();
    expect(screen.getByText("Stem of question 1")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("turns amber at 5 minutes and red at 1 minute, announcing each", async () => {
    renderWs(detail({ remainingSeconds: 302 }));
    const badge = screen.getByTestId("timer-badge");
    expect(badge).toHaveAttribute("data-tone", "normal");
    const live = screen.getByTestId("timer-announcement");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent("");
    await ms(3000);
    expect(badge).toHaveAttribute("data-tone", "amber");
    expect(live).toHaveTextContent("5 minutes remaining");
    await ms(240_000);
    expect(badge).toHaveAttribute("data-tone", "red");
    expect(live).toHaveTextContent("1 minute remaining");
  });

  it("an untimed session shows no timer", () => {
    renderWs(detail({ timed: false }));
    expect(screen.queryByTestId("timer-badge")).not.toBeInTheDocument();
  });

  it("at zero submits exactly once and navigates to results", async () => {
    renderWs(detail({ remainingSeconds: 3 }));
    await ms(3500);
    expect(submitCalls()).toHaveLength(1);
    expect(push).toHaveBeenCalledWith(RESULTS);
    await ms(10_000);
    expect(submitCalls()).toHaveLength(1);
  });

  it("re-syncs from the server when the tab becomes visible again", async () => {
    renderWs(detail({ remainingSeconds: 600 }));
    apiFetch.mockImplementation(async () => detail({ remainingSeconds: 100 }));
    await act(async () => void document.dispatchEvent(new Event("visibilitychange")));
    expect(apiFetch).toHaveBeenCalledWith(`/practice/sessions/${SESSION_ID}`);
    expect(screen.getByText("01:40 remaining")).toBeInTheDocument();
  });

  it("a session that closed meanwhile sends the student to results", async () => {
    renderWs();
    apiFetch.mockImplementation(async () => ({ ...detail(), session: { ...detail().session, status: "expired", remainingSeconds: 0 } }));
    await act(async () => void document.dispatchEvent(new Event("visibilitychange")));
    expect(push).toHaveBeenCalledWith(RESULTS);
  });

  it("a 409 session_expired on save navigates to results without a second submit", async () => {
    apiFetch.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method === "PUT") throw new ApiError(409, "session_expired", "Time is up");
      return {};
    });
    renderWs();
    await click(radio(/^A/));
    await ms(AUTOSAVE_DEBOUNCE_MS);
    expect(push).toHaveBeenCalledWith(RESULTS);
    expect(submitCalls()).toHaveLength(0);
  });
});

describe("Workspace answering and autosave", () => {
  it("selecting saves after the debounce and shows Saving then Saved", async () => {
    renderWs();
    await click(radio(/^B/));
    expect(radio(/^B/)).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("save-status")).toHaveTextContent("Saving…");
    expect(putCalls()).toHaveLength(0);
    await ms(AUTOSAVE_DEBOUNCE_MS);
    expect(putCalls()).toHaveLength(1);
    expect(putCalls()[0][0]).toBe(`/practice/sessions/${SESSION_ID}/answers/1`);
    expect(lastPutBody()).toEqual({ selected: "B" });
    expect(screen.getByTestId("save-status")).toHaveTextContent("Saved");
  });

  it("clicking the selected option again, or Clear, deselects in test mode", async () => {
    renderWs();
    await click(radio(/^B/));
    await click(radio(/^B/));
    expect(radio(/^B/)).toHaveAttribute("aria-checked", "false");
    await click(radio(/^C/));
    await click(screen.getByRole("button", { name: "Clear" }));
    expect(radio(/^C/)).toHaveAttribute("aria-checked", "false");
    await ms(AUTOSAVE_DEBOUNCE_MS);
    expect(lastPutBody()).toEqual({ selected: null });
  });

  it("a failed save shows the retry indicator, retries, and recovers", async () => {
    let fail = true;
    apiFetch.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        if (fail) throw new ApiError(0, "network_error", "down");
        return { saved: true };
      }
      return {};
    });
    renderWs();
    await click(radio(/^A/));
    await ms(AUTOSAVE_DEBOUNCE_MS);
    expect(screen.getByTestId("save-status")).toHaveTextContent("Could not save — retrying");
    fail = false;
    await ms(RETRY_DELAY_MS);
    expect(screen.getByTestId("save-status")).toHaveTextContent("Saved");
    expect(lastPutBody()).toEqual({ selected: "A" });
  });

  it("the Retry button saves immediately", async () => {
    let fail = true;
    apiFetch.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        if (fail) throw new ApiError(500, "internal", "boom");
        return { saved: true };
      }
      return {};
    });
    renderWs();
    await click(radio(/^A/));
    await ms(AUTOSAVE_DEBOUNCE_MS);
    fail = false;
    await click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByTestId("save-status")).toHaveTextContent("Saved");
  });

  it("blur on the options flushes the debounce", async () => {
    renderWs();
    await click(radio(/^A/));
    await act(async () => void fireEvent.blur(screen.getByRole("radiogroup", { name: "Answer options" })));
    expect(putCalls()).toHaveLength(1);
  });

  it("Flag for review toggles and saves", async () => {
    renderWs();
    await click(screen.getByRole("button", { name: "Flag for review" }));
    expect(screen.getByRole("button", { name: "Flagged for review" })).toHaveAttribute("aria-pressed", "true");
    await ms(AUTOSAVE_DEBOUNCE_MS);
    expect(lastPutBody()).toEqual({ flagged: true });
  });

  it("Save & next saves now and moves on; Skip and Previous move without answering", async () => {
    renderWs();
    await click(radio(/^D/));
    await click(screen.getByRole("button", { name: "Save & next" }));
    expect(putCalls().length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Question 2 of 4/ })).toBeInTheDocument();
    await click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByRole("heading", { name: /Question 3 of 4/ })).toBeInTheDocument();
    await click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("heading", { name: /Question 2 of 4/ })).toBeInTheDocument();
  });

  it("renders statements as a numbered list", async () => {
    renderWs(detail(), { initialOrdinal: 2 });
    const list = screen.getByRole("list", { name: "Statements" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("confidence chips appear once answered and save the choice", async () => {
    renderWs();
    expect(screen.queryByRole("radiogroup", { name: "How sure are you?" })).not.toBeInTheDocument();
    await click(radio(/^A/));
    await click(screen.getByRole("radio", { name: "Sure" }));
    await ms(AUTOSAVE_DEBOUNCE_MS);
    expect(lastPutBody()).toEqual({ selected: "A", confidence: "sure" });
  });
});

describe("Workspace keyboard", () => {
  it("A-D select, N and P navigate, F flags", async () => {
    renderWs();
    await press("c");
    expect(radio(/^C/)).toHaveAttribute("aria-checked", "true");
    await press("n");
    expect(screen.getByRole("heading", { name: /Question 2 of 4/ })).toBeInTheDocument();
    await press("p");
    expect(screen.getByRole("heading", { name: /Question 1 of 4/ })).toBeInTheDocument();
    await press("F");
    expect(screen.getByRole("button", { name: "Flagged for review" })).toBeInTheDocument();
  });

  it("does not fire while typing in an input or textarea", async () => {
    renderWs();
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    ta.focus();
    for (const k of ["a", "b", "n", "p", "f"]) await press(k, ta);
    expect(screen.getByRole("heading", { name: /Question 1 of 4/ })).toBeInTheDocument();
    expect(radio(/^A/)).toHaveAttribute("aria-checked", "false");
    expect(radio(/^B/)).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("button", { name: "Flagged for review" })).not.toBeInTheDocument();
    ta.remove();
  });

  it("ignores modified keys (browser shortcuts)", async () => {
    renderWs();
    await act(async () => void fireEvent.keyDown(document.body, { key: "n", ctrlKey: true }));
    expect(screen.getByRole("heading", { name: /Question 1 of 4/ })).toBeInTheDocument();
  });
});

describe("Workspace navigation panel and refresh restore", () => {
  const counts = () => screen.getByTestId("nav-counts").textContent;

  it("shows Answered / Flagged / Remaining and updates", async () => {
    renderWs();
    expect(counts()).toBe("Answered 0 · Flagged 0 · Remaining 4");
    await press("a");
    await press("f");
    expect(counts()).toBe("Answered 1 · Flagged 1 · Remaining 3");
    expect(screen.getByRole("button", { name: "Question 1, answered, flagged" })).toBeInTheDocument();
    await click(screen.getByRole("button", { name: "Question 3, not answered" }));
    expect(screen.getByRole("heading", { name: /Question 3 of 4/ })).toBeInTheDocument();
  });

  it("restores answers, flags and position from the server state", () => {
    const d = detail({
      questions: [question(1, { selected: "B", flagged: true }), question(2, { selected: "C" }), question(3), question(4)],
    });
    renderWs(d);
    // lands on the first unanswered question
    expect(screen.getByRole("heading", { name: /Question 3 of 4/ })).toBeInTheDocument();
    expect(counts()).toBe("Answered 2 · Flagged 1 · Remaining 2");
    expect(screen.getByRole("button", { name: "Question 1, answered, flagged" })).toBeInTheDocument();
  });

  it("an explicit position wins and is clamped", () => {
    renderWs(detail(), { initialOrdinal: 4 });
    expect(screen.getByRole("heading", { name: /Question 4 of 4/ })).toBeInTheDocument();
  });

  it("shows the short-set notice built from the page", () => {
    renderWs(detail(), { note: "Started with 3 of 5 requested questions. Not enough matching questions were available." });
    expect(screen.getByText(/Started with 3 of 5 requested questions/)).toBeInTheDocument();
  });
});

describe("Workspace submit", () => {
  async function openDialog() {
    await click(screen.getByRole("button", { name: "Submit" }));
    return screen.getByRole("dialog");
  }

  it("lists unanswered and flagged counts", async () => {
    renderWs();
    await press("a");
    await press("n");
    await press("f");
    const dialog = await openDialog();
    expect(within(dialog).getByText("3 unanswered")).toBeInTheDocument();
    expect(within(dialog).getByText("1 flagged for review")).toBeInTheDocument();
  });

  it("waits for the pending save, then submits once and navigates", async () => {
    let release!: () => void;
    apiFetch.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        await new Promise<void>((r) => (release = r));
        return { saved: true };
      }
      return {};
    });
    renderWs();
    await press("a");
    const dialog = await openDialog();
    const confirm = within(dialog).getByRole("button", { name: "Submit now" });
    await click(confirm);
    await click(confirm);
    expect(submitCalls()).toHaveLength(0);
    await act(async () => release());
    await ms(0);
    expect(submitCalls()).toHaveLength(1);
    expect(push).toHaveBeenCalledWith(RESULTS);
  });

  it("does not submit while saves keep failing, and says why", async () => {
    apiFetch.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method === "PUT") throw new ApiError(0, "network_error", "down");
      return {};
    });
    renderWs();
    await press("a");
    const dialog = await openDialog();
    await click(within(dialog).getByRole("button", { name: "Submit now" }));
    expect(submitCalls()).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent(/could not save/i);
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Submit now" })).toBeEnabled();
  });

  it("a failed submit can be retried", async () => {
    let n = 0;
    apiFetch.mockImplementation(async (p: string, init?: RequestInit) => {
      if (init?.method === "PUT") return { saved: true };
      if (p.endsWith("/submit") && n++ === 0) throw new ApiError(500, "internal", "boom");
      return {};
    });
    renderWs();
    const dialog = await openDialog();
    await click(within(dialog).getByRole("button", { name: "Submit now" }));
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toBeInTheDocument();
    await click(within(screen.getByRole("dialog")).getByRole("button", { name: "Submit now" }));
    expect(push).toHaveBeenCalledWith(RESULTS);
  });
});

describe("Workspace learning mode", () => {
  const feedback = { correctOption: "B" as const, correct: false, explanation: "Article 21 covers this." };

  it("Check reveals feedback from the PUT response and locks the question", async () => {
    apiFetch.mockImplementation(async (_p: string, init?: RequestInit) => (init?.method === "PUT" ? { saved: true, feedback } : {}));
    renderWs(detail({ mode: "learning" }));
    await click(radio(/^A/));
    expect(putCalls()).toHaveLength(0); // nothing is committed before Check
    expect(screen.queryByText("Article 21 covers this.")).not.toBeInTheDocument();
    await click(screen.getByRole("button", { name: "Check" }));
    expect(lastPutBody()).toEqual({ selected: "A" });
    expect(screen.getByText("Article 21 covers this.")).toBeInTheDocument();
    expect(screen.getByText(/Correct answer: B/)).toBeInTheDocument();
    expect(radio(/^C/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Check" })).not.toBeInTheDocument();
    await press("d");
    expect(radio(/^A/)).toHaveAttribute("aria-checked", "true");
  });

  it("restores a checked question with its feedback after refresh", () => {
    const d = detail({ mode: "learning", questions: [question(1, { selected: "A", feedback: { ...feedback, correct: false } }), question(2), question(3), question(4)] });
    renderWs(d, { initialOrdinal: 1 });
    expect(screen.getByText("Article 21 covers this.")).toBeInTheDocument();
    expect(radio(/^B/)).toBeDisabled();
  });

  it("offers no Clear in learning mode", () => {
    renderWs(detail({ mode: "learning" }));
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });
});

describe("Workspace test mode never shows answer keys", () => {
  it("renders no key, explanation or feedback markup before submit", async () => {
    const { container } = renderWs();
    await click(radio(/^A/));
    await ms(AUTOSAVE_DEBOUNCE_MS);
    await press("n");
    const html = container.ownerDocument.body.innerHTML;
    expect(html).not.toMatch(/correctOption/i);
    expect(html).not.toMatch(/explanation/i);
    expect(html).not.toMatch(/correct answer/i);
    expect(html).not.toMatch(/optionReasoning|misconception/i);
  });

  it("drops feedback even if a payload carried it in test mode", () => {
    const d = detail({
      questions: [question(1, { feedback: { correctOption: "B", correct: true, explanation: "LEAKED" } }), question(2), question(3), question(4)],
    });
    renderWs(d, { initialOrdinal: 1 });
    expect(document.body.innerHTML).not.toContain("LEAKED");
  });
});
