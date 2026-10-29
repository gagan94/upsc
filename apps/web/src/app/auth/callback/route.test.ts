import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabase: async () => ({ auth: { exchangeCodeForSession } }),
}));

const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));

import { GET } from "./route";

const call = (qs: string) => GET(new Request(`http://localhost:3000/auth/callback?${qs}`));

beforeEach(() => {
  exchangeCodeForSession.mockReset();
  serverApi.mockReset();
  serverApi.mockResolvedValue({ status: "completed", step: 5, answers: {} });
});

describe("GET /auth/callback", () => {
  it("redirects to return_to on success", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await call("code=abc&return_to=/learn");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(res.headers.get("location")).toBe("http://localhost:3000/learn");
  });
  it("rejects open redirects", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await call("code=abc&return_to=//evil.com");
    expect(res.headers.get("location")).toBe("http://localhost:3000/home");
  });
  it("redirects to login on exchange error", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "bad" } });
    const res = await call("code=abc");
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=oauth_failed");
  });
  it("redirects to login when code is missing", async () => {
    const res = await call("return_to=/learn");
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=oauth_failed");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("sends a not_started user to /onboarding using the fresh session token", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null });
    serverApi.mockResolvedValue({ status: "not_started", step: 0, answers: {} });
    const res = await call("code=abc");
    expect(serverApi).toHaveBeenCalledWith("/me/onboarding", { token: "tok" });
    expect(res.headers.get("location")).toBe("http://localhost:3000/onboarding");
  });
  it.each(["in_progress", "completed", "skipped"])("sends a %s user to /home", async (status) => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    serverApi.mockResolvedValue({ status, step: 1, answers: {} });
    const res = await call("code=abc");
    expect(res.headers.get("location")).toBe("http://localhost:3000/home");
  });
  it("goes to /home when the onboarding lookup fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    serverApi.mockRejectedValue(new Error("down"));
    const res = await call("code=abc");
    expect(res.headers.get("location")).toBe("http://localhost:3000/home");
  });
  it("still rejects open redirects for a not_started user's fallback", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    serverApi.mockRejectedValue(new Error("down"));
    const res = await call("code=abc&return_to=//evil.com");
    expect(res.headers.get("location")).toBe("http://localhost:3000/home");
  });
});
