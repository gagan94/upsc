import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));

import LearnPage from "./page";

const subject = (i: number) => ({
  id: `s${i}`, slug: `s-${i}`, title: `Subject ${i}`, gsPaper: "GS I", moduleCount: 1, lessonCount: 1,
});

beforeEach(() => {
  serverApi.mockReset();
  redirect.mockClear();
});

describe("LearnPage", () => {
  it("renders a card per subject", async () => {
    serverApi.mockResolvedValue({ subjects: Array.from({ length: 8 }, (_, i) => subject(i)) });
    render(await LearnPage());
    expect(screen.getByRole("heading", { level: 1, name: "Learn" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(8);
    expect(serverApi).toHaveBeenCalledWith("/learn/subjects");
    expect(screen.getByText("Lesson reader arrives in Phase 8")).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    serverApi.mockResolvedValue({ subjects: [] });
    render(await LearnPage());
    expect(screen.getByText("No subjects yet")).toBeInTheDocument();
  });

  it("shows error state with retry link", async () => {
    serverApi.mockRejectedValue(new ApiError(500, "internal", "boom"));
    render(await LearnPage());
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/learn");
  });

  it("redirects to login on 401", async () => {
    serverApi.mockRejectedValue(new ApiError(401, "unauthenticated", "no"));
    await expect(LearnPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
