import { beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabase: async () => ({ auth: { signOut } }),
}));

import { GET } from "./route";

const call = () => GET(new Request("http://localhost:3000/auth/signout"));

beforeEach(() => {
  signOut.mockReset();
});

describe("GET /auth/signout", () => {
  it("signs out and redirects to login with session_rejected", async () => {
    signOut.mockResolvedValue({ error: null });
    const res = await call();
    expect(signOut).toHaveBeenCalled();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=session_rejected");
  });

  it("still redirects when signOut returns an error", async () => {
    signOut.mockResolvedValue({ error: { message: "x" } });
    const res = await call();
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=session_rejected");
  });

  it("still redirects when signOut throws", async () => {
    signOut.mockRejectedValue(new Error("network"));
    const res = await call();
    expect(signOut).toHaveBeenCalled();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?error=session_rejected");
  });
});
