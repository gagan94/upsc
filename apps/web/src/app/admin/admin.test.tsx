import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const REDIRECT = "NEXT_REDIRECT_SENTINEL";
const redirect = vi.fn((url: string) => {
  throw new Error(`${REDIRECT}:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (u: string) => redirect(u),
  usePathname: () => "/admin/users",
}));
const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (p: string) => serverApi(p) }));
const apiFetch = vi.fn();
vi.mock("@/lib/api", async () => {
  class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return { ApiError, apiFetch: (p: string) => apiFetch(p) };
});

import { ApiError } from "@/lib/api";
import AdminLayout from "./layout";
import AdminHome from "./page";
import UsersPage from "./users/page";
import PlansPage from "./plans/page";
import { ADMIN_SECTIONS } from "@/components/AdminNav";

const admin = { id: "a", email: "a@x.co", name: "Ada Admin", roles: ["admin"], timezone: "Asia/Kolkata", locale: "en" };
const row = (n: number, extra: object = {}) => ({
  id: `u${n}`,
  email: `user${n}@x.co`,
  name: `User ${n}`,
  roles: ["student"],
  status: "active",
  createdAt: "2026-01-01T00:00:00Z",
  lastLoginAt: n === 1 ? null : "2026-10-01T10:00:00Z",
  ...extra,
});

beforeEach(() => {
  serverApi.mockReset();
  apiFetch.mockReset();
  redirect.mockClear();
});

describe("admin layout", () => {
  it("redirects students to /home without fetching admin data", async () => {
    serverApi.mockResolvedValue({ user: { ...admin, roles: ["student"] } });
    await expect(AdminLayout({ children: <p>x</p> })).rejects.toThrow(`${REDIRECT}:/home`);
    expect(redirect).toHaveBeenCalledWith("/home");
    expect(serverApi.mock.calls.map((c) => c[0])).toEqual(["/me"]);
  });

  it("redirects signed-out visitors to login", async () => {
    serverApi.mockRejectedValue(new ApiError(401, "unauthenticated", "no"));
    await expect(AdminLayout({ children: <p>x</p> })).rejects.toThrow(`${REDIRECT}:/login?return_to=%2Fadmin`);
  });

  it("shows an error panel on other API errors", async () => {
    serverApi.mockRejectedValue(new ApiError(500, "internal", "boom"));
    render(await AdminLayout({ children: <p>x</p> }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/admin");
  });

  it("renders chrome and nav with exactly two live links for admins", async () => {
    serverApi.mockResolvedValue({ user: admin });
    render(await AdminLayout({ children: <p>child</p> }));
    expect(screen.getByText("AI UPSC · Admin")).toBeInTheDocument();
    expect(screen.getByText("Ada Admin")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to app" })).toHaveAttribute("href", "/home");
    expect(screen.getByText("child")).toBeInTheDocument();
    const nav = within(screen.getByRole("navigation", { name: "Admin" }));
    const links = nav.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Users", "Plans & entitlements"]);
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(document.querySelectorAll('[aria-disabled="true"]')).toHaveLength(13);
    expect(ADMIN_SECTIONS).toHaveLength(15);
    expect(screen.getAllByText("Coming in a later phase")).toHaveLength(13);
  });
});

describe("admin overview", () => {
  it("links to users and plans", () => {
    render(<AdminHome />);
    expect(screen.getByRole("heading", { level: 1, name: "Admin" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Users/ })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: /Plans & entitlements/ })).toHaveAttribute("href", "/admin/plans");
    expect(screen.getByText("Other sections arrive in later phases.")).toBeInTheDocument();
  });
});

describe("users page", () => {
  it("renders rows and never leaks extra fields", async () => {
    serverApi.mockResolvedValue({
      users: [row(1, { authSubject: "secret", authProvider: "google" }), row(2)],
      nextCursor: null,
    });
    render(await UsersPage());
    expect(serverApi).toHaveBeenCalledWith("/admin/users?limit=25");
    expect(screen.getByRole("heading", { level: 1, name: "Users" })).toBeInTheDocument();
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("user2@x.co")).toBeInTheDocument();
    expect(screen.getByText("Never")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/secret|authSubject|authProvider|google|password/i);
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("shows empty state", async () => {
    serverApi.mockResolvedValue({ users: [], nextCursor: null });
    render(await UsersPage());
    expect(screen.getByText("No users yet")).toBeInTheDocument();
  });

  it("Load more appends the next page and hides at the end", async () => {
    serverApi.mockResolvedValue({ users: [row(1)], nextCursor: "c 1" });
    apiFetch.mockResolvedValue({ users: [row(3, { authSubject: "secret" })], nextCursor: null });
    render(await UsersPage());
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(screen.getByText("User 3")).toBeInTheDocument());
    expect(apiFetch).toHaveBeenCalledWith("/admin/users?limit=25&cursor=c%201");
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    expect(document.body.textContent).not.toMatch(/secret/);
  });

  it("shows an inline alert when loading more fails", async () => {
    serverApi.mockResolvedValue({ users: [row(1)], nextCursor: "c" });
    apiFetch.mockRejectedValue(new Error("x"));
    render(await UsersPage());
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Load more" })).toBeEnabled();
  });
});

describe("plans page", () => {
  it("renders the free plan with 13 entitlement rows", async () => {
    const entitlements = Array.from({ length: 13 }, (_, i) => ({
      featureKey: `feature_${i}`,
      enabled: i % 2 === 0,
      limitValue: i === 1 ? 5 : null,
      period: "month",
    }));
    serverApi.mockResolvedValue({ plans: [{ key: "free", name: "Free", isDefault: true, entitlements }] });
    render(await PlansPage());
    expect(serverApi).toHaveBeenCalledWith("/admin/plans");
    expect(screen.getByRole("heading", { level: 1, name: "Plans & entitlements" })).toBeInTheDocument();
    expect(screen.getByText("free")).toBeInTheDocument();
    expect(screen.getByText("Default plan")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(14);
    expect(screen.getByText("feature_12")).toBeInTheDocument();
  });

  it("shows empty state", async () => {
    serverApi.mockResolvedValue({ plans: [] });
    render(await PlansPage());
    expect(screen.getByText("No plans yet")).toBeInTheDocument();
  });
});
