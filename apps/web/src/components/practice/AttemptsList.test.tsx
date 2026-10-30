import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api";
import userEvent from "@/components/planner/user-shim";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { attempt } from "./fixtures";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));

import { AttemptsList } from "./AttemptsList";

beforeEach(() => {
  apiFetch.mockReset();
});

describe("AttemptsList", () => {
  it("shows an empty state", () => {
    render(<AttemptsList initial={{ attempts: [], nextCursor: null }} tz="Asia/Kolkata" />);
    expect(screen.getByText(/No attempts yet/)).toBeInTheDocument();
  });

  it("appends the next page and hides Load more at the end", async () => {
    apiFetch.mockResolvedValue({ attempts: [attempt({ id: "a2", title: "Second set" })], nextCursor: null });
    render(<AttemptsList initial={{ attempts: [attempt()], nextCursor: "CUR" }} tz="Asia/Kolkata" />);
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(apiFetch).toHaveBeenCalledWith("/practice/attempts?limit=20&cursor=CUR");
    expect(await screen.findByText("Second set")).toBeInTheDocument();
    expect(screen.getByText("Indian Polity practice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("shows a score for test mode and accuracy only for learning mode", () => {
    render(
      <AttemptsList
        initial={{ attempts: [attempt(), attempt({ id: "a2", mode: "learning", score: null, title: "Learn set" })], nextCursor: null }}
        tz="Asia/Kolkata"
      />,
    );
    expect(screen.getByText(/Score 10\.68/)).toBeInTheDocument();
    expect(screen.getAllByText(/Accuracy 75%/)).toHaveLength(2);
    expect(screen.getAllByText(/Score/)).toHaveLength(1);
  });

  it("keeps the list and shows an error if loading more fails", async () => {
    apiFetch.mockImplementation(async () => {
      throw new ApiError(500, "internal", "x");
    });
    render(<AttemptsList initial={{ attempts: [attempt()], nextCursor: "CUR" }} tz="Asia/Kolkata" />);
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load more" })).toBeEnabled();
  });
});
