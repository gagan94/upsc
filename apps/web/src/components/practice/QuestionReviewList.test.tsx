import { render, screen } from "@testing-library/react";
import userEvent from "@/components/planner/user-shim";
import { describe, expect, it } from "vitest";
import { RESULTS_SESSION_ID, results } from "./review-fixtures";
import { QuestionReviewList } from "./QuestionReviewList";

const show = () => render(<QuestionReviewList sessionId={RESULTS_SESSION_ID} questions={results().questions} />);
const rows = () => screen.getAllByRole("listitem").map((li) => li.textContent);

describe("QuestionReviewList", () => {
  it("lists every question with icon text and a review link", () => {
    show();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("link", { name: /Question 2.*Incorrect/ })).toHaveAttribute("href", `/prelims/review/${RESULTS_SESSION_ID}/2`);
    expect(screen.getByRole("link", { name: /Question 3.*Skipped/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Question 1.*Correct/ })).toBeInTheDocument();
  });

  it("filters by Incorrect, Bookmarked and Skipped, and back to All", async () => {
    show();
    await userEvent.click(screen.getByRole("radio", { name: "Incorrect" }));
    expect(rows()).toHaveLength(2);
    await userEvent.click(screen.getByRole("radio", { name: "Bookmarked" }));
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatch(/Question 4/);
    await userEvent.click(screen.getByRole("radio", { name: "Skipped" }));
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatch(/Question 3/);
    await userEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(rows()).toHaveLength(5);
  });
});
