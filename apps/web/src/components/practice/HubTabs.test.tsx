import { render, screen } from "@testing-library/react";
import userEvent from "@/components/planner/user-shim";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { HubTabs } from "./HubTabs";

beforeEach(() => {
  push.mockReset();
});

describe("HubTabs", () => {
  it("selects the tab named by the URL", () => {
    render(<HubTabs tab="mistakes">x</HubTabs>);
    expect(screen.getByRole("tab", { name: "Mistakes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("tab").filter((t) => t.getAttribute("aria-selected") === "true")).toHaveLength(1);
  });

  it("navigates with ?tab on click", async () => {
    render(<HubTabs tab="practice">x</HubTabs>);
    await userEvent.click(screen.getByRole("tab", { name: "PYQs" }));
    expect(push).toHaveBeenCalledWith("/prelims?tab=pyq");
  });

  it("renders Phase 7 tabs disabled and not focusable",  () => {
    render(<HubTabs tab="practice">x</HubTabs>);
    for (const name of ["Mock tests", "CSAT", "Analytics", "Weekly challenge"]) {
      const el = screen.getByRole("button", { name: new RegExp(name) });
      expect(el).toBeDisabled();
      expect(el).toHaveAttribute("title", "Arrives in Phase 7");
      expect(screen.queryByRole("link", { name: new RegExp(name) })).toBeNull();
    }
    expect(screen.getByText("Mock tests").closest("button")).toBeDisabled();
  });
});
