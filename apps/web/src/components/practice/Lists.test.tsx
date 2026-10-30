import { render, screen, within } from "@testing-library/react";
import userEvent from "@/components/planner/user-shim";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { history, polity, subjects } from "./fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { BookmarksList } from "./BookmarksList";
import { MistakesList } from "./MistakesList";
import { PyqPanel } from "./PyqPanel";

beforeEach(() => {
  push.mockReset();
});

describe("PyqPanel", () => {
  it("explains and shows the empty message when nothing is verified", () => {
    render(<PyqPanel subjects={subjects} />);
    expect(screen.getByText("No verified previous-year questions yet")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /PYQ/ })).toBeNull();
    expect(screen.getByText(/Verified previous-year questions will appear here/)).toBeInTheDocument();
  });

  it("lists per-subject counts and links to a PYQ-only set", () => {
    render(<PyqPanel subjects={[{ ...polity, pyqVerifiedCount: 4 }, history]} />);
    expect(screen.getByText("4 verified")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start a PYQ-only set" })).toHaveAttribute("href", "/prelims/new?source=pyq");
  });
});

describe("BookmarksList", () => {
  it("shows empty state and items", () => {
    const { rerender } = render(<BookmarksList items={[]} />);
    expect(screen.getByText(/No bookmarks yet/)).toBeInTheDocument();
    rerender(<BookmarksList items={[{ questionId: "q1", stem: "Which article?", subjectTitle: "Indian Polity", createdAt: "2026-10-14T00:00:00Z" }]} />);
    expect(screen.getByText("Which article?")).toBeInTheDocument();
    expect(screen.getByText("Indian Polity")).toBeInTheDocument();
  });
});

describe("MistakesList", () => {
  const item = { questionId: "q1", stem: "Which of these…", subjectTitle: "Indian Polity", reason: "guessed" as const, timesWrong: 2, lastSeen: "2026-10-14T00:00:00Z" };

  it("shows stem, subject, reason and times wrong with no per-item link", () => {
    render(<MistakesList items={[item]} subjects={subjects} subject="" includeResolved={false} />);
    expect(screen.getByText("Which of these…")).toBeInTheDocument();
    expect(within(screen.getByRole("list")).getByText("Indian Polity")).toBeInTheDocument();
    expect(screen.getByText("Guessed")).toBeInTheDocument();
    expect(screen.getByText("Wrong 2 times")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("filters by subject and resolved via the URL", async () => {
    render(<MistakesList items={[item]} subjects={subjects} subject="" includeResolved={false} />);
    await userEvent.selectOptions(screen.getByLabelText("Subject"), polity.id);
    expect(push).toHaveBeenCalledWith(`/prelims?tab=mistakes&subject=${polity.id}`);
    await userEvent.click(screen.getByRole("checkbox", { name: "Include resolved" }));
    expect(push).toHaveBeenLastCalledWith("/prelims?tab=mistakes&resolved=1");
  });

  it("shows an empty state", () => {
    render(<MistakesList items={[]} subjects={subjects} subject="" includeResolved={false} />);
    expect(screen.getByText(/No mistakes to review/)).toBeInTheDocument();
  });
});
