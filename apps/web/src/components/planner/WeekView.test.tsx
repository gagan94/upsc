import { render, screen, within } from "@testing-library/react";
import userEvent from "./user-shim";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));

import { WeekView } from "./WeekView";
import { subjects, task } from "./fixtures";

const realTZ = process.env.TZ;
beforeAll(() => {
  // The browser zone must never matter: run as a user far east of IST.
  process.env.TZ = "Pacific/Auckland";
});
afterEach(() => {
  process.env.TZ = realTZ;
});
beforeEach(() => {
  apiFetch.mockReset();
});

const view = (tasks = [task()], today = "2026-10-14") =>
  render(<WeekView weekStart="2026-10-12" tasks={tasks} subjects={subjects} tz="Asia/Kolkata" today={today} />);

const column = (name: RegExp) => screen.getByRole("group", { name });

describe("WeekView", () => {
  it("renders seven day columns with today highlighted", () => {
    view();
    expect(screen.getAllByRole("group")).toHaveLength(7);
    expect(column(/Mon,? 12 Oct/)).toBeInTheDocument();
    expect(column(/Sun,? 18 Oct/)).toBeInTheDocument();
    expect(column(/Wed,? 14 Oct/)).toHaveAttribute("aria-current", "date");
    expect(column(/Tue,? 13 Oct/)).not.toHaveAttribute("aria-current");
  });

  it("places a 23:30 IST task in the IST column even when the browser zone differs", () => {
    // 18:00Z = 23:30 IST on the 14th (but 07:00 on the 15th in Auckland).
    view([task({ id: "late", title: "Late reading", scheduledStart: "2026-10-14T18:00:00.000Z" })]);
    expect(within(column(/Wed,? 14 Oct/)).getByText("Late reading")).toBeInTheDocument();
    expect(within(column(/Thu,? 15 Oct/)).queryByText("Late reading")).toBeNull();
  });

  it("puts a 00:10 IST task on its own (later) day", () => {
    view([task({ id: "early", title: "Early start", scheduledStart: "2026-10-14T18:40:00.000Z" })]);
    expect(within(column(/Thu,? 15 Oct/)).getByText("Early start")).toBeInTheDocument();
    expect(within(column(/Wed,? 14 Oct/)).queryByText("Early start")).toBeNull();
  });

  it("orders cards by time and shows planned minutes per day (skipped excluded)", () => {
    view([
      task({ id: "b", title: "Second", scheduledStart: "2026-10-14T08:30:00.000Z", durationMin: 60 }),
      task({ id: "a", title: "First", scheduledStart: "2026-10-14T03:30:00.000Z", durationMin: 30 }),
      task({ id: "c", title: "Skipped one", scheduledStart: "2026-10-14T10:30:00.000Z", durationMin: 100, status: "skipped" }),
    ]);
    const col = column(/Wed,? 14 Oct/);
    const names = within(col).getAllByRole("button", { name: /^Open / }).map((b) => b.textContent);
    expect(names[0]).toContain("First");
    expect(names[1]).toContain("Second");
    expect(within(col).getByText("1h 30m planned")).toBeInTheDocument();
  });

  it("has previous and next week links", () => {
    view();
    expect(screen.getByRole("link", { name: "Previous week" })).toHaveAttribute("href", "/planner?view=week&date=2026-10-05");
    expect(screen.getByRole("link", { name: "Next week" })).toHaveAttribute("href", "/planner?view=week&date=2026-10-19");
  });

  it("opens the task dialog when a card is clicked", async () => {
    view();
    await userEvent.click(screen.getByRole("button", { name: /Open Read Laxmikanth ch 3/ }));
    expect(screen.getByRole("dialog", { name: "Edit task" })).toBeInTheDocument();
  });

  it("Move to… is keyboard accessible and reschedules keeping the wall-clock time", async () => {
    apiFetch.mockResolvedValue({ task: task({ scheduledStart: "2026-10-16T04:30:00.000Z" }) });
    view();
    const trigger = screen.getByRole("button", { name: "Move Read Laxmikanth ch 3 to…" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(8); // seven days + Unscheduled
    expect(items[2]).toHaveFocus(); // opens on the current day (Wed)
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: /Fri,? 16 Oct/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(apiFetch).toHaveBeenCalledWith(
      "/planner/tasks/t1/reschedule",
      expect.objectContaining({ body: JSON.stringify({ scheduledStart: "2026-10-16T04:30:00.000Z" }) }),
    );
    expect(await within(column(/Fri,? 16 Oct/)).findByText("Read Laxmikanth ch 3")).toBeInTheDocument();
    expect(within(column(/Wed,? 14 Oct/)).queryByText("Read Laxmikanth ch 3")).toBeNull();
  });

  it("Escape closes the menu and returns focus to the trigger", async () => {
    view();
    const trigger = screen.getByRole("button", { name: "Move Read Laxmikanth ch 3 to…" });
    await userEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("shows an empty hint for days without tasks", () => {
    view([]);
    expect(screen.getAllByText("Nothing planned")).toHaveLength(7);
  });
});
