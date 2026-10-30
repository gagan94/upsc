import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (u: string) => redirect(u),
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/home",
}));
vi.mock("@/components/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));

vi.mock("@/components/study/StudySessionProvider", () => ({
  StudySessionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="study-provider">{children}</div>,
}));

import AppLayout from "./layout";

const user = { id: "u", email: "a@x.co", name: "A", roles: ["student"], timezone: "Asia/Kolkata", locale: "en" };

beforeEach(() => {
  serverApi.mockReset();
  redirect.mockClear();
  refresh.mockClear();
});

describe("app layout", () => {
  it("renders the shell for a signed-in user", async () => {
    serverApi.mockResolvedValue({ user });
    render(await AppLayout({ children: <p>child</p> }));
    expect(screen.getByTestId("shell")).toHaveTextContent("child");
  });

  it("mounts the study-session provider around the shell, and not on the error panel", async () => {
    serverApi.mockResolvedValue({ user });
    render(await AppLayout({ children: <p>child</p> }));
    expect(screen.getByTestId("study-provider")).toContainElement(screen.getByTestId("shell"));
  });

  it("signs out (no login loop) when the API rejects the session", async () => {
    serverApi.mockRejectedValue(new ApiError(401, "unauthenticated", "no"));
    await expect(AppLayout({ children: <p>x</p> })).rejects.toThrow("NEXT_REDIRECT:/auth/signout");
    expect(redirect).toHaveBeenCalledWith("/auth/signout");
  });

  it("shows an error panel with retry and log out on other API errors", async () => {
    serverApi.mockRejectedValue(new ApiError(0, "network_error", "down"));
    render(await AppLayout({ children: <p>x</p> }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByTestId("study-provider")).toBeNull();
    expect(screen.getByRole("link", { name: "Log out" })).toHaveAttribute("href", "/auth/signout");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("shows the error panel with log out on 409 email_conflict", async () => {
    serverApi.mockRejectedValue(new ApiError(409, "email_conflict", "conflict"));
    render(await AppLayout({ children: <p>x</p> }));
    expect(screen.getByRole("link", { name: "Log out" })).toHaveAttribute("href", "/auth/signout");
  });
});
