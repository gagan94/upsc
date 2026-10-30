import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const REDIRECT = "NEXT_REDIRECT_SENTINEL";
const redirect = vi.fn((url: string) => {
  throw new Error(`${REDIRECT}:${url}`);
});
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  redirect: (u: string) => redirect(u),
  notFound: () => notFound(),
  usePathname: () => "/admin/questions",
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));
const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (p: string) => serverApi(p) }));
vi.mock("@/lib/api", async () => {
  class ApiError extends Error {
    status: number;
    code: string;
    details: Record<string, unknown> = {};
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return { ApiError, apiFetch: vi.fn() };
});

import { ApiError } from "@/lib/api";
import AdminLayout from "../layout";
import QuestionsPage from "./page";
import NewQuestionPage from "./new/page";
import EditQuestionPage from "./[id]/page";
import ImportQuestionsPage from "./import/page";
import QuestionReportsPage from "../question-reports/page";

const user = (roles: string[]) => ({ id: "a", email: "a@x.co", name: "Ed", roles, timezone: "Asia/Kolkata", locale: "en" });
const NID = "0190b3a0-0000-7000-8000-000000000001";
const QID = "0190b3a0-0000-7000-8000-0000000000aa";
const nodes = [{ id: NID, slug: "geo", title: "Geography", paper: "GS1", examStage: "prelims", level: 3, parentId: null }];
const q = {
  id: "q1", format: "single", stem: "A stem", statements: null,
  options: ["A", "B", "C", "D"].map((key) => ({ key, text: key })), correctOption: "A", explanation: "", optionReasoning: {},
  misconception: null, difficulty: "easy", subjectNodeId: NID, topic: null, gsPaper: "GS1", sourceType: "platform", pyqYear: null,
  pyqPaper: null, verificationStatus: "unverified", status: "draft", version: 1, createdBy: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
};

beforeEach(() => {
  serverApi.mockReset();
  redirect.mockClear();
  notFound.mockClear();
});

describe("question bank access", () => {
  it("redirects a student visiting /admin/questions to /home (admin layout guard)", async () => {
    serverApi.mockResolvedValue({ user: user(["student"]) });
    await expect(AdminLayout({ children: <QuestionsPage /> })).rejects.toThrow(`${REDIRECT}:/home`);
    expect(serverApi.mock.calls.map((c) => c[0])).toEqual(["/me"]);
  });

  it("lets a content editor in", async () => {
    serverApi.mockResolvedValue({ user: user(["content_editor"]) });
    render(await AdminLayout({ children: <p>inside</p> }));
    expect(screen.getByText("inside")).toBeInTheDocument();
  });
});

describe("question pages", () => {
  it("list page fetches status=all with a page size and the subjects, and links to new/import/reports", async () => {
    serverApi.mockImplementation(async (p: string) => (p.startsWith("/admin/syllabus") ? { nodes } : { questions: [q], nextCursor: null }));
    render(await QuestionsPage());
    expect(serverApi).toHaveBeenCalledWith("/admin/questions?status=all&limit=25");
    expect(screen.getByRole("link", { name: "New question" })).toHaveAttribute("href", "/admin/questions/new");
    expect(screen.getByRole("link", { name: "Import" })).toHaveAttribute("href", "/admin/questions/import");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/admin/question-reports");
    expect(screen.getAllByText("Geography · GS Paper I").length).toBeGreaterThan(1); // filter option + row subject
  });

  it("list page still renders, with an error and retry, when the subject list fails", async () => {
    serverApi.mockImplementation(async (p: string) => {
      if (p.startsWith("/admin/syllabus")) throw new ApiError(500, "internal", "x");
      return { questions: [], nextCursor: null };
    });
    render(await QuestionsPage());
    expect(screen.getByText("No questions yet")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load the subject list");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("form pages show the error and no form when the subject list fails", async () => {
    serverApi.mockRejectedValue(new ApiError(500, "internal", "x"));
    render(await NewQuestionPage());
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load the subject list");
    expect(screen.queryByRole("button", { name: "Create question" })).toBeNull();
  });

  it("new and import pages render their forms", async () => {
    serverApi.mockResolvedValue({ nodes });
    render(await NewQuestionPage());
    expect(screen.getByRole("button", { name: "Create question" })).toBeInTheDocument();
    render(<ImportQuestionsPage />);
    expect(screen.getByRole("button", { name: "Validate and import" })).toBeInTheDocument();
  });

  it("edit page loads the question and 404s for an unknown id", async () => {
    serverApi.mockImplementation(async (p: string) => (p.startsWith("/admin/syllabus") ? { nodes } : { question: q }));
    render(await EditQuestionPage({ params: Promise.resolve({ id: QID }) }));
    expect(serverApi).toHaveBeenCalledWith(`/admin/questions/${QID}`);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    serverApi.mockReset();
    serverApi.mockRejectedValue(new ApiError(404, "not_found", "x"));
    await expect(EditQuestionPage({ params: Promise.resolve({ id: QID }) })).rejects.toThrow("NEXT_NOT_FOUND");
    serverApi.mockClear();
    await expect(EditQuestionPage({ params: Promise.resolve({ id: "zz" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(serverApi).not.toHaveBeenCalled();
  });

  it("reports page lists open reports", async () => {
    serverApi.mockResolvedValue({ reports: [{ id: "r1", questionId: "q1", userId: "u", type: "typo", text: null, status: "open", createdAt: "2026-10-01T00:00:00Z", stem: "Stem 1" }] });
    render(await QuestionReportsPage());
    expect(serverApi).toHaveBeenCalledWith("/admin/question-reports?limit=50");
    expect(screen.getByText("Typo")).toBeInTheDocument();
  });
});
