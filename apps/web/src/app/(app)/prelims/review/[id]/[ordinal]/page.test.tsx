import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { RESULTS_SESSION_ID, results, review } from "@/components/practice/review-fixtures";

const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: vi.fn() }));

import ReviewPage from "./page";

const call = (ordinal = "2") => ReviewPage({ params: Promise.resolve({ id: RESULTS_SESSION_ID, ordinal }) });
const base = `/practice/sessions/${RESULTS_SESSION_ID}`;
function route(handlers: { review?: unknown; results?: unknown }) {
  serverApi.mockImplementation(async (path: string) => {
    const h = path.endsWith("/review") ? handlers.review : handlers.results;
    if (h instanceof Error) throw h;
    return h;
  });
}
beforeEach(() => {
  serverApi.mockReset();
});

describe("ReviewPage", () => {
  it("loads the review and the set size", async () => {
    route({ review: review(), results: results() });
    render(await call());
    expect(serverApi).toHaveBeenCalledWith(`${base}/questions/2/review`);
    expect(serverApi).toHaveBeenCalledWith(`${base}/results`);
    expect(screen.getByRole("heading", { name: "Question 2 of 5" })).toBeInTheDocument();
  });
  it("shows the 409 message with a link back to the workspace", async () => {
    route({ review: new ApiError(409, "not_submitted", "This session has not been submitted yet"), results: new ApiError(409, "not_submitted", "x") });
    render(await call());
    expect(screen.getByText("This session has not been submitted yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to your practice set" })).toHaveAttribute("href", `/prelims/session/${RESULTS_SESSION_ID}`);
    expect(screen.queryByText(/is correct/)).toBeNull();
  });
  it("redirects to /login on 401", async () => {
    route({ review: new ApiError(401, "unauthenticated", "no"), results: new ApiError(401, "unauthenticated", "no") });
    await expect(call()).rejects.toThrow("NEXT_REDIRECT:/login");
  });
  it("shows not found for a bad ordinal without calling the API", async () => {
    render(await call("abc"));
    expect(screen.getByRole("heading", { name: /couldn't find/ })).toBeInTheDocument();
    expect(serverApi).not.toHaveBeenCalled();
  });
  it("shows an error panel when the review fails", async () => {
    route({ review: new ApiError(500, "internal", "x"), results: results() });
    render(await call());
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
