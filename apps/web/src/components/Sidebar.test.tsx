import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const pathname = "/notes";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/supabase-browser", () => ({
  createBrowserSupabase: () => ({ auth: { signOut: vi.fn() } }),
}));

import { AppShell } from "./AppShell";
import { Sidebar } from "./Sidebar";

const user = { id: "u1", email: "a@b.co", name: "Asha Rao", roles: ["learner"], timezone: "Asia/Kolkata", locale: "en" };

describe("Sidebar", () => {
  it("renders upper-case group headings", () => {
    render(<Sidebar pathname={pathname} />);
    for (const h of ["OVERVIEW", "STUDY", "CURRENT AFFAIRS", "PRACTICE", "PLAN & TRACK", "COMMUNITY"]) {
      expect(screen.getByText(h)).toBeInTheDocument();
    }
  });

  it("marks only the active item with aria-current=page", () => {
    render(<Sidebar pathname="/notes" />);
    expect(screen.getByRole("link", { name: "Notes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Learn" })).not.toHaveAttribute("aria-current");
    expect(screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page")).toHaveLength(1);
  });

  it("mobile menu button toggles aria-expanded and reveals the nav", () => {
    render(<AppShell user={user}>content</AppShell>);
    const btn = screen.getByRole("button", { name: "Open navigation" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("app-sidebar")).toHaveAttribute("data-open", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("app-sidebar")).toHaveAttribute("data-open", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });
});
