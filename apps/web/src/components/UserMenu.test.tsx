import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: push, refresh }) }));
const signOut = vi.fn();
vi.mock("@/lib/supabase-browser", () => ({ createBrowserSupabase: () => ({ auth: { signOut } }) }));

import { UserMenu } from "./UserMenu";

const base = { id: "u1", email: "a@b.co", name: "Asha Rao", roles: ["learner"], timezone: "Asia/Kolkata", locale: "en" };

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  signOut.mockReset();
});

describe("UserMenu", () => {
  it("shows initials and name", () => {
    render(<UserMenu user={base} />);
    expect(screen.getByText("AR")).toBeInTheDocument();
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
  });

  it("shows Admin only for admins", () => {
    const { unmount } = render(<UserMenu user={base} />);
    fireEvent.click(screen.getByRole("button", { name: /Asha Rao/ }));
    expect(screen.getByRole("menuitem", { name: "My profile" })).toHaveAttribute("href", "/settings?section=my-profile");
    expect(screen.queryByRole("menuitem", { name: "Admin" })).toBeNull();
    unmount();
    render(<UserMenu user={{ ...base, roles: ["admin"] }} />);
    fireEvent.click(screen.getByRole("button", { name: /Asha Rao/ }));
    expect(screen.getByRole("menuitem", { name: "Admin" })).toHaveAttribute("href", "/admin");
  });

  it("opens with aria state and closes on Escape", () => {
    render(<UserMenu user={base} />);
    const btn = screen.getByRole("button", { name: /Asha Rao/ });
    expect(btn).toHaveAttribute("aria-haspopup", "menu");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("Log out signs out then navigates to /login", async () => {
    signOut.mockResolvedValue({ error: null });
    render(<UserMenu user={base} />);
    fireEvent.click(screen.getByRole("button", { name: /Asha Rao/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(signOut).toHaveBeenCalled();
    expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(push.mock.invocationCallOrder[0]);
    expect(refresh).toHaveBeenCalled();
  });

  it("Log out still navigates to /login when signOut throws", async () => {
    signOut.mockRejectedValue(new Error("network"));
    render(<UserMenu user={base} />);
    fireEvent.click(screen.getByRole("button", { name: /Asha Rao/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    expect(refresh).toHaveBeenCalled();
  });
});
