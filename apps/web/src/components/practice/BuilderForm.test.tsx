import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@/components/planner/user-shim";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { history, polity, subjects } from "./fixtures";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { BuilderForm } from "./BuilderForm";

beforeEach(() => {
  apiFetch.mockReset();
  push.mockReset();
  apiFetch.mockImplementation(async (p: string) => {
    if (p.startsWith("/practice/availability")) return { requested: 20, available: 12 };
    throw new Error(p);
  });
});

const start = () => screen.getByRole("button", { name: "Start" });

describe("BuilderForm", () => {
  it("disables Start until a subject is chosen and does not check availability", () => {
    render(<BuilderForm subjects={subjects} />);
    expect(start()).toBeDisabled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("shows how many questions are available once subjects are picked", async () => {
    render(<BuilderForm subjects={subjects} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /Indian Polity/ }));
    expect(await screen.findByText("12 of 20 requested available")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith(`/practice/availability?subjects=${polity.id}&source=platform&count=20`);
    expect(start()).toBeEnabled();
  });

  it("preselects the subject from ?subject", async () => {
    render(<BuilderForm subjects={subjects} initialSubject={history.id} />);
    expect(screen.getByRole("checkbox", { name: /Modern History/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Indian Polity/ })).not.toBeChecked();
    await screen.findByText("12 of 20 requested available");
  });

  it("ignores an unknown ?subject", () => {
    render(<BuilderForm subjects={subjects} initialSubject="nope" />);
    expect(start()).toBeDisabled();
  });

  it("PYQs only with zero verified questions shows the empty message and keeps Start disabled", async () => {
    render(<BuilderForm subjects={subjects} initialSubject={polity.id} />);
    await screen.findByText("12 of 20 requested available");
    apiFetch.mockClear();
    await userEvent.click(screen.getByRole("radio", { name: "PYQs only" }));
    expect(screen.getByText("No verified previous-year questions yet")).toBeInTheDocument();
    expect(start()).toBeDisabled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("starts a set and navigates to the workspace", async () => {
    apiFetch.mockImplementation(async (p: string) => {
      if (p.startsWith("/practice/availability")) return { requested: 10, available: 10 };
      return { session: { id: "s-1" }, requested: 10, got: 10 };
    });
    render(<BuilderForm subjects={subjects} initialSubject={polity.id} />);
    await userEvent.click(screen.getByRole("radio", { name: "10" }));
    await userEvent.click(screen.getByRole("radio", { name: "Test" }));
    await userEvent.click(screen.getByRole("radio", { name: "Timed" }));
    await screen.findByText("All 10 requested questions available");
    await userEvent.click(start());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/prelims/session/s-1"));
    const post = apiFetch.mock.calls.find((c) => c[0] === "/practice/sessions");
    expect(JSON.parse(post![1].body)).toEqual({ subjectNodeIds: [polity.id], source: "platform", count: 10, mode: "test", timed: true });
  });

  it("carries a short set to the workspace in ?note", async () => {
    apiFetch.mockImplementation(async (p: string) =>
      p.startsWith("/practice/availability") ? { requested: 20, available: 12 } : { session: { id: "s-2" }, requested: 20, got: 12 },
    );
    render(<BuilderForm subjects={subjects} initialSubject={polity.id} />);
    await screen.findByText("12 of 20 requested available");
    await userEvent.click(start());
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith(`/prelims/session/s-2?note=${encodeURIComponent("Started with 12 of 20 requested questions")}`);
  });

  it("shows the API message when the start fails", async () => {
    apiFetch.mockImplementation(async (p: string) => {
      if (p.startsWith("/practice/availability")) return { requested: 20, available: 12 };
      throw new ApiError(402, "entitlement_required", "Upgrade to start more practice sets");
    });
    render(<BuilderForm subjects={subjects} initialSubject={polity.id} />);
    await screen.findByText("12 of 20 requested available");
    await userEvent.click(start());
    expect(await screen.findByText("Upgrade to start more practice sets")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
