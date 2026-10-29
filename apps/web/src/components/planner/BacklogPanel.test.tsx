import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "./user-shim";
import { describe, expect, it, vi } from "vitest";
import { BacklogPanel } from "./BacklogPanel";
import { task } from "./fixtures";

describe("BacklogPanel", () => {
  it("Schedule calls reschedule with an instant in the user's zone", async () => {
    const onSchedule = vi.fn();
    render(<BacklogPanel tasks={[task({ id: "u1", title: "Item", scheduledStart: null })]} tz="Asia/Kolkata" date="2026-10-14" onSchedule={onSchedule} />);
    await userEvent.click(screen.getByRole("button", { name: "Schedule Item" }));
    await userEvent.click(screen.getByRole("button", { name: "Schedule task" }));
    await waitFor(() => expect(onSchedule).toHaveBeenCalledWith(expect.objectContaining({ id: "u1" }), "2026-10-14T03:30:00.000Z"));
  });

  it("shows an empty state", () => {
    render(<BacklogPanel tasks={[]} tz="Asia/Kolkata" date="2026-10-14" onSchedule={vi.fn()} />);
    expect(screen.getByText("Your backlog is empty")).toBeInTheDocument();
  });
});
