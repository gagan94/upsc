import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubjectCard } from "./SubjectCard";

const base = { id: "s1", slug: "indian-polity", title: "Indian Polity", gsPaper: "GS II", syllabusNodeId: "n1", moduleCount: 4, lessonCount: 6 };

describe("SubjectCard", () => {
  it("renders title, GS paper chip and counts", () => {
    render(<SubjectCard subject={base} />);
    expect(screen.getByRole("heading", { name: "Indian Polity" })).toBeInTheDocument();
    expect(screen.getByText("GS II")).toBeInTheDocument();
    expect(screen.getByText("4 modules · 6 lessons")).toBeInTheDocument();
  });

  it("uses singular forms", () => {
    render(<SubjectCard subject={{ ...base, moduleCount: 1, lessonCount: 1 }} />);
    expect(screen.getByText("1 module · 1 lesson")).toBeInTheDocument();
  });

  it("shows non-GS paper values as given", () => {
    render(<SubjectCard subject={{ ...base, gsPaper: "Prelims Paper II" }} />);
    expect(screen.getByText("Prelims Paper II")).toBeInTheDocument();
  });
});
