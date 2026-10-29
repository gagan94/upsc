import { render, screen } from "@testing-library/react";
import userEvent from "./user-shim";
import { describe, expect, it, vi } from "vitest";
import { TaskRow } from "./TaskRow";
import { task } from "./fixtures";

const handlers = () => ({
  onComplete: vi.fn(),
  onSkip: vi.fn(),
  onReschedule: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
});

describe("TaskRow", () => {
  it("renders title as text, never HTML", () => {
    render(<TaskRow task={task({ title: "<b>bold</b>" })} tz="Asia/Kolkata" {...handlers()} />);
    expect(screen.getByText("<b>bold</b>")).toBeInTheDocument();
    expect(document.querySelector("b")).toBeNull();
  });

  it("styles completed and skipped tasks", () => {
    const { rerender } = render(<TaskRow task={task({ status: "completed" })} tz="Asia/Kolkata" {...handlers()} />);
    expect(screen.getByText("Read Laxmikanth ch 3")).toHaveClass("line-through");
    expect(screen.getByText("Completed")).toBeInTheDocument();
    rerender(<TaskRow task={task({ status: "skipped" })} tz="Asia/Kolkata" {...handlers()} />);
    expect(screen.getByText("Skipped")).toBeInTheDocument();
  });

  it("actions menu is keyboard operable", async () => {
    const h = handlers();
    render(<TaskRow task={task()} tz="Asia/Kolkata" {...h} />);
    const btn = screen.getByRole("button", { name: "Actions for Read Laxmikanth ch 3" });
    btn.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Complete" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Skip" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(h.onSkip).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(btn).toHaveFocus();
  });

  it("Escape closes the menu", async () => {
    render(<TaskRow task={task()} tz="Asia/Kolkata" {...handlers()} />);
    await userEvent.click(screen.getByRole("button", { name: /Actions for/ }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
