import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabase: async () => ({ auth: { exchangeCodeForSession } }),
}));

import { GET } from "./route";

const call = (qs: string) => GET(new Request(`http://localhost:3000/auth/callback?${qs}`));

beforeEach(() => exchangeCodeForSession.mockReset());

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
});
