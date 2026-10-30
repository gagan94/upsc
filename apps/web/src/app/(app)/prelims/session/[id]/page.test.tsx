import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { detail, SESSION_ID } from "@/components/practice/session-fixtures";

const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import SessionPage from "./page";

const call = (sp: { note?: string; q?: string } = {}) => SessionPage({ params: Promise.resolve({ id: SESSION_ID }), searchParams: Promise.resolve(sp) });

beforeEach(() => {
  serverApi.mockReset();
  redirect.mockClear();
});

describe("SessionPage", () => {
  it("loads the session and renders the workspace", async () => {
    serverApi.mockResolvedValue(detail());
    render(await call());
    expect(serverApi).toHaveBeenCalledWith(`/practice/sessions/${SESSION_ID}`);
    expect(screen.getByRole("heading", { name: /Question 1 of 4/ })).toBeInTheDocument();
  });

  it.each(["submitted", "expired"] as const)("redirects a %s session to results", async (status) => {
    const d = detail();
    serverApi.mockResolvedValue({ ...d, session: { ...d.session, status } });
    await expect(call()).rejects.toThrow(`NEXT_REDIRECT:/prelims/results/${SESSION_ID}`);
  });

  it("redirects to /login on 401", async () => {
    serverApi.mockRejectedValue(new ApiError(401, "unauthenticated", "no"));
    await expect(call()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("shows an embedded error panel with Try again on API failure", async () => {
    serverApi.mockRejectedValue(new ApiError(500, "internal", "boom"));
    render(await call());
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(document.querySelector("main")).toBeNull();
  });

  it("renders a valid ?note as a rebuilt sentence and never echoes a raw one", async () => {
    serverApi.mockResolvedValue(detail());
    const { unmount } = render(await call({ note: "Started with 3 of 5 requested questions" }));
    expect(screen.getByText(/Started with 3 of 5 requested questions\. Not enough/)).toBeInTheDocument();
    unmount();
    render(await call({ note: "<b>pwned</b>" }));
    expect(screen.queryByText(/pwned/)).not.toBeInTheDocument();
  });
});
