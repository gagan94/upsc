import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh, replace: vi.fn() }) }));
const apiFetch = vi.fn();
vi.mock("@/lib/api", async () => {
  class ApiError extends Error {
    status: number;
    code: string;
    details: Record<string, unknown>;
    constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
      super(message);
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }
  return { ApiError, apiFetch: (p: string, i?: RequestInit) => apiFetch(p, i) };
});

import { ApiError } from "@/lib/api";
import type { AdminQuestionReport, PracticeSubject, QuestionAdminView } from "@/lib/types";
import { ImportForm } from "./ImportForm";
import { QuestionForm } from "./QuestionForm";
import { QuestionsTable } from "./QuestionsTable";
import { ReportsPanel } from "./ReportsPanel";

const NODE = "0190b3a0-0000-7000-8000-000000000001";
const subjects: PracticeSubject[] = [{ id: NODE, title: "Geography", gsPaper: "GS1", publishedCount: 3, pyqVerifiedCount: 0 }];

const question = (extra: Partial<QuestionAdminView> = {}): QuestionAdminView => ({
  id: "q1",
  format: "single",
  stem: "Which river is the longest in India?",
  statements: null,
  options: [
    { key: "A", text: "Ganga" },
    { key: "B", text: "Godavari" },
    { key: "C", text: "Yamuna" },
    { key: "D", text: "Krishna" },
  ],
  correctOption: "A",
  explanation: "",
  optionReasoning: {},
  misconception: null,
  difficulty: "easy",
  subjectNodeId: NODE,
  topic: null,
  gsPaper: "GS1",
  sourceType: "platform",
  pyqYear: null,
  pyqPaper: null,
  verificationStatus: "unverified",
  status: "draft",
  version: 1,
  createdBy: "u1",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  ...extra,
});
const complete = (extra: Partial<QuestionAdminView> = {}) =>
  question({ explanation: "Because.", optionReasoning: { A: "a", B: "b", C: "c", D: "d" }, ...extra });

beforeEach(() => {
  apiFetch.mockReset();
  push.mockReset();
  refresh.mockReset();
});

describe("QuestionForm validation", () => {
  it("blocks submit and shows inline errors until four options and a correct one are given", () => {
    render(<QuestionForm subjects={subjects} />);
    fireEvent.change(screen.getByLabelText("Stem"), { target: { value: "A stem" } });
    fireEvent.change(screen.getByLabelText("Option A text"), { target: { value: "One" } });
    fireEvent.click(screen.getByRole("button", { name: "Create question" }));
    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByText("Option B text is required")).toBeInTheDocument();
    expect(screen.getByText("Option D text is required")).toBeInTheDocument();
    expect(screen.getByText("Choose the correct option")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("adds and removes statements only for the statements format", () => {
    render(<QuestionForm subjects={subjects} />);
    expect(screen.queryByLabelText("Statement 1")).toBeNull();
    fireEvent.change(screen.getByLabelText("Format"), { target: { value: "statements" } });
    fireEvent.click(screen.getByRole("button", { name: "Add statement" }));
    expect(screen.getByLabelText("Statement 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove statement 2" }));
    expect(screen.queryByLabelText("Statement 2")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove statement 1" })).toBeNull();
  });

  it("creates a question and opens it", async () => {
    apiFetch.mockResolvedValue({ question: question({ id: "new1" }) });
    render(<QuestionForm subjects={subjects} />);
    fireEvent.change(screen.getByLabelText("Stem"), { target: { value: "A stem" } });
    for (const [k, t] of [["A", "One"], ["B", "Two"], ["C", "Three"], ["D", "Four"]]) {
      fireEvent.change(screen.getByLabelText(`Option ${k} text`), { target: { value: t } });
    }
    fireEvent.click(screen.getByLabelText("Option C is correct"));
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: NODE } });
    fireEvent.click(screen.getByRole("button", { name: "Create question" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/questions/new1"));
    const [path, init] = apiFetch.mock.calls[0];
    expect(path).toBe("/admin/questions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({ format: "single", stem: "A stem", correctOption: "C", subjectNodeId: NODE, gsPaper: "GS1" });
  });

  it("maps a duplicate stem conflict to the stem field", async () => {
    apiFetch.mockRejectedValue(new ApiError(409, "duplicate_stem", "dup"));
    render(<QuestionForm subjects={subjects} question={question()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByText("A question with this stem already exists")).toBeInTheDocument());
  });
});

describe("QuestionForm actions", () => {
  it("disables Publish with the reason until explanation and four reasonings are saved", () => {
    render(<QuestionForm subjects={subjects} question={question({ explanation: "x", optionReasoning: { A: "a" } })} />);
    const publish = screen.getByRole("button", { name: "Publish" });
    expect(publish).toBeDisabled();
    expect(screen.getByText(/Cannot publish yet: missing reasoning for B, reasoning for C, reasoning for D/)).toBeInTheDocument();
  });

  it("publishes a complete question", async () => {
    apiFetch.mockResolvedValue({ question: complete({ status: "published" }) });
    render(<QuestionForm subjects={subjects} question={complete()} />);
    const publish = screen.getByRole("button", { name: "Publish" });
    expect(publish).toBeEnabled();
    fireEvent.click(publish);
    await waitFor(() => expect(screen.getByText("Published")).toBeInTheDocument());
    expect(apiFetch).toHaveBeenCalledWith("/admin/questions/q1/publish", { method: "POST" });
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("requires the saved state for Publish when the form has unsaved edits", () => {
    render(<QuestionForm subjects={subjects} question={complete()} />);
    fireEvent.change(screen.getByLabelText("Stem"), { target: { value: "Edited stem" } });
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    expect(screen.getByText("Save your changes first, then publish.")).toBeInTheDocument();
  });

  it("disables Verify for a PYQ without year and paper, and sends {} otherwise", async () => {
    const { unmount } = render(<QuestionForm subjects={subjects} question={question({ sourceType: "pyq" })} />);
    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
    expect(screen.getByText(/Add the PYQ year and paper and save/)).toBeInTheDocument();
    unmount();
    apiFetch.mockResolvedValue({ question: question({ verificationStatus: "verified" }) });
    render(<QuestionForm subjects={subjects} question={question()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(screen.getByText("Verified")).toBeInTheDocument());
    expect(apiFetch.mock.calls[0][0]).toBe("/admin/questions/q1/verify");
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({});
  });

  it("retires a question", async () => {
    apiFetch.mockResolvedValue({ question: complete({ status: "retired" }) });
    render(<QuestionForm subjects={subjects} question={complete({ status: "published" })} />);
    fireEvent.click(screen.getByRole("button", { name: "Retire" }));
    await waitFor(() => expect(screen.getByText("Retired")).toBeInTheDocument());
    expect(apiFetch).toHaveBeenCalledWith("/admin/questions/q1/retire", { method: "POST" });
  });

  it("shows the server's missing list when publish is refused", async () => {
    apiFetch.mockRejectedValue(new ApiError(400, "incomplete_question", "x", { missing: ["explanation"] }));
    render(<QuestionForm subjects={subjects} question={complete()} />);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Missing: explanation"));
  });
});

describe("QuestionForm correct-option change", () => {
  it("asks for a reason, sends it, and shows the new version", async () => {
    apiFetch.mockResolvedValue({ question: complete({ correctOption: "B", version: 2 }) });
    render(<QuestionForm subjects={subjects} question={complete()} />);
    expect(screen.queryByLabelText("Reason for changing the correct option")).toBeNull();
    fireEvent.click(screen.getByLabelText("Option B is correct"));
    const reason = screen.getByLabelText("Reason for changing the correct option");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByText("Explain why the correct option is changing")).toBeInTheDocument();
    fireEvent.change(reason, { target: { value: "Key was wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByText(/now version 2/)).toBeInTheDocument());
    const [path, init] = apiFetch.mock.calls[0];
    expect(path).toBe("/admin/questions/q1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toMatchObject({ correctOption: "B", reason: "Key was wrong" });
    expect(screen.getByText("Version 2")).toBeInTheDocument();
  });
});

describe("QuestionsTable", () => {
  const page = { questions: [question({ id: "q1" }), question({ id: "q2", stem: "Second stem", status: "published" })], nextCursor: "c 1" };

  it("renders rows with status and links; Load more appends and hides at the end", async () => {
    apiFetch.mockResolvedValue({ questions: [question({ id: "q3", stem: "Third stem" })], nextCursor: null });
    render(<QuestionsTable initial={page} subjects={subjects} />);
    expect(screen.getByRole("link", { name: /Which river/ })).toHaveAttribute("href", "/admin/questions/q1");
    expect(within(screen.getByRole("table")).getByText("Published")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(screen.getByText("Third stem")).toBeInTheDocument());
    expect(apiFetch.mock.calls[0][0]).toBe("/admin/questions?status=all&limit=25&cursor=c+1");
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    expect(screen.getByText("Second stem")).toBeInTheDocument();
  });

  it("applies filters through the query string and replaces the list", async () => {
    apiFetch.mockResolvedValue({ questions: [], nextCursor: null });
    render(<QuestionsTable initial={page} subjects={subjects} />);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "draft" } });
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "pyq" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: NODE } });
    fireEvent.change(screen.getByLabelText("Search stems"), { target: { value: "river" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(screen.getByText("No questions match these filters")).toBeInTheDocument());
    expect(apiFetch.mock.calls[0][0]).toBe(`/admin/questions?status=draft&subjectNodeId=${NODE}&sourceType=pyq&q=river&limit=25`);
  });

  it("shows an inline alert when loading fails and keeps the list", async () => {
    apiFetch.mockRejectedValue(new Error("x"));
    render(<QuestionsTable initial={page} subjects={subjects} />);
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("Second stem")).toBeInTheDocument();
  });
});

describe("ImportForm", () => {
  const paste = (text: string) => fireEvent.change(screen.getByLabelText("Questions JSON"), { target: { value: text } });

  it("rejects malformed JSON and a missing items array without calling the API", () => {
    render(<ImportForm />);
    paste("{nope");
    fireEvent.click(screen.getByRole("button", { name: "Validate and import" }));
    expect(screen.getByRole("alert")).toHaveTextContent("not valid JSON");
    paste('{"rows":[]}');
    fireEvent.click(screen.getByRole("button", { name: "Validate and import" }));
    expect(screen.getByRole("alert")).toHaveTextContent('must be an object like {"items": [ ... ]}');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("shows the created count and a table of row errors by index", async () => {
    apiFetch.mockResolvedValue({ created: 2, errors: [{ index: 3, message: "Duplicate stem" }, { index: 5, message: "options: Exactly four options are required" }] });
    render(<ImportForm />);
    paste('{"items":[{},{},{},{},{},{}]}');
    fireEvent.click(screen.getByRole("button", { name: "Validate and import" }));
    await waitFor(() => expect(screen.getByText("2 questions created as drafts")).toBeInTheDocument());
    expect(apiFetch.mock.calls[0][0]).toBe("/admin/questions/import");
    expect(JSON.parse(apiFetch.mock.calls[0][1].body).items).toHaveLength(6);
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("3");
    expect(rows[1]).toHaveTextContent("Duplicate stem");
    expect(screen.getByText("2 rows had errors")).toBeInTheDocument();
  });

  it("reads an uploaded file into the box", async () => {
    render(<ImportForm />);
    const file = new File(['{"items":[{"a":1}]}'], "q.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve('{"items":[{"a":1}]}') });
    fireEvent.change(screen.getByLabelText("Upload a JSON file"), { target: { files: [file] } });
    await waitFor(() => expect((screen.getByLabelText("Questions JSON") as HTMLTextAreaElement).value).toContain('"items"'));
  });

  it("explains a 413 payload_too_large", async () => {
    apiFetch.mockRejectedValue(new ApiError(413, "payload_too_large", "big"));
    render(<ImportForm />);
    paste('{"items":[{}]}');
    fireEvent.click(screen.getByRole("button", { name: "Validate and import" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("larger than 5 MB"));
  });
});

describe("ReportsPanel", () => {
  const r = (n: number): AdminQuestionReport => ({
    id: `r${n}`, questionId: `q${n}`, userId: "u", type: "wrong_key", text: n === 1 ? "Key looks wrong" : null, status: "open", createdAt: "2026-10-01T10:00:00Z", stem: `Stem ${n}`,
  });
  it("lists open reports linking to the question, with an empty state", () => {
    const { unmount } = render(<ReportsPanel reports={[r(1), r(2)]} />);
    expect(screen.getByRole("link", { name: /Stem 1/ })).toHaveAttribute("href", "/admin/questions/q1");
    expect(screen.getAllByText("Wrong key")).toHaveLength(2);
    expect(screen.getByText("Key looks wrong")).toBeInTheDocument();
    unmount();
    render(<ReportsPanel reports={[]} />);
    expect(screen.getByText("No open reports")).toBeInTheDocument();
  });
});
