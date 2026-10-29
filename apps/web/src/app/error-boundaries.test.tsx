import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppError from "./(app)/error";
import AdminError from "./admin/error";

const apiError = (status: number) => Object.assign(new Error("x"), { name: "ApiError", status, code: "c" });

describe.each([
  ["(app)/error", AppError],
  ["admin/error", AdminError],
])("%s", (_name, Boundary) => {
  it("shows a friendly message, retries with reset() and offers log out", () => {
    const reset = vi.fn();
    render(<Boundary error={Object.assign(new Error("boom"), { digest: "123" })} reset={reset} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong loading this page.");
    expect(screen.queryByText(/session or permissions changed/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Log out" })).toHaveAttribute("href", "/auth/signout");
  });

  it.each([401, 403])("explains a %i as a session or permission change", (status) => {
    render(<Boundary error={apiError(status)} reset={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Your session or permissions changed");
    expect(screen.getByRole("link", { name: "Log out" })).toHaveAttribute("href", "/auth/signout");
  });

  it("treats a non-auth status as a generic failure", () => {
    render(<Boundary error={apiError(500)} reset={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong loading this page.");
  });
});
