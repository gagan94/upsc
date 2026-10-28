import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/supabase-browser", () => ({
  createBrowserSupabase: () => ({ auth: { getSession } }),
}));

import { ApiError, apiFetch } from "@/lib/api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  getSession.mockResolvedValue({ data: { session: { access_token: "abc" } } });
});
afterEach(() => {
  fetchMock.mockReset();
  getSession.mockReset();
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("apiFetch", () => {
  it("sends the bearer token when a session exists", async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    await apiFetch("/me");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/me");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer abc");
  });

  it("sends no Authorization header without a session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    fetchMock.mockResolvedValue(json({ ok: true }));
    await apiFetch("/health");
    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
  });

  it("returns parsed JSON on success", async () => {
    fetchMock.mockResolvedValue(json({ id: 1 }));
    await expect(apiFetch<{ id: number }>("/x")).resolves.toEqual({ id: 1 });
  });

  it("throws ApiError from the error envelope", async () => {
    fetchMock.mockResolvedValue(
      json({ error: { code: "unauthenticated", message: "x" } }, 401),
    );
    const err = (await apiFetch("/me").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("unauthenticated");
  });

  it("throws network_error for a non-JSON error body", async () => {
    fetchMock.mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 }));
    const err = (await apiFetch("/me").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("network_error");
    expect(err.status).toBe(502);
  });
});
