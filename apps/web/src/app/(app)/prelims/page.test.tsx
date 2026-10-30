import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { attempt, polity, subjects } from "@/components/practice/fixtures";

const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u), useRouter: () => ({ push: vi.fn() }) }));

import PrelimsPage from "./page";
import NewPracticePage from "./new/page";

const route = (path: string) => {
  if (path === "/me/profile") return { timezone: "Asia/Kolkata" };
  if (path.startsWith("/practice/attempts")) return { attempts: [attempt()], nextCursor: null };
  if (path === "/practice/subjects") return { subjects };
  if (path === "/practice/bookmarks") return { items: [{ questionId: "q", stem: "Bookmarked stem", subjectTitle: "Indian Polity", createdAt: "2026-10-14T00:00:00Z" }] };
  if (path.startsWith("/practice/mistakes")) return { items: [] };
  throw new Error(path);
};

beforeEach(() => {
  serverApi.mockReset();
  serverApi.mockImplementation(async (p: string) => route(p));
  redirect.mockClear();
});

describe("PrelimsPage", () => {
  it("defaults to Practice, shows recent sets and labels sample data", async () => {
    render(await PrelimsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Indian Polity practice")).toBeInTheDocument();
    expect(screen.getAllByText(/Sample questions/).length).toBeGreaterThan(0);
    expect(serverApi).toHaveBeenCalledWith("/practice/attempts?limit=5");
  });

  it("is driven by ?tab and falls back for unknown values", async () => {
    render(await PrelimsPage({ searchParams: Promise.resolve({ tab: "bookmarks" }) }));
    expect(screen.getByRole("tab", { name: "Bookmarks" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Bookmarked stem")).toBeInTheDocument();
  });

  it("falls back to Practice for an unknown tab", async () => {
    render(await PrelimsPage({ searchParams: Promise.resolve({ tab: "mock" }) }));
    expect(screen.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
  });

  it("passes mistakes filters to the API", async () => {
    render(await PrelimsPage({ searchParams: Promise.resolve({ tab: "mistakes", subject: polity.id, resolved: "1" }) }));
    expect(serverApi).toHaveBeenCalledWith(`/practice/mistakes?subject=${polity.id}&includeResolved=true`);
    expect(screen.getByLabelText("Subject")).toHaveValue(polity.id);
  });

  it("redirects to /login on 401", async () => {
    serverApi.mockRejectedValue(new ApiError(401, "unauthenticated", "x"));
    await expect(PrelimsPage({ searchParams: Promise.resolve({ tab: "pyq" }) })).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("shows an error panel with Try again on API failure", async () => {
    serverApi.mockRejectedValue(new ApiError(500, "internal", "boom"));
    render(await PrelimsPage({ searchParams: Promise.resolve({ tab: "pyq" }) }));
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/prelims?tab=pyq");
  });
});

describe("NewPracticePage", () => {
  it("preselects the subject from ?subject", async () => {
    render(await NewPracticePage({ searchParams: Promise.resolve({ subject: polity.id }) }));
    expect(screen.getByRole("checkbox", { name: /Indian Polity/ })).toBeChecked();
  });

  it("shows an error panel on failure", async () => {
    serverApi.mockRejectedValue(new ApiError(500, "internal", "boom"));
    render(await NewPracticePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/prelims/new");
  });
});
