import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AppearanceApplier } from "./AppearanceApplier";

beforeEach(() => {
  localStorage.clear();
  ["data-theme", "data-text-size", "data-contrast", "data-motion"].forEach((a) =>
    document.documentElement.removeAttribute(a),
  );
});

describe("AppearanceApplier", () => {
  it("applies stored settings to <html> on mount and renders nothing", () => {
    localStorage.setItem(
      "upsc.appearance",
      JSON.stringify({ theme: "dark", textSize: "125", highContrast: false, reducedMotion: true }),
    );
    const { container } = render(<AppearanceApplier />);
    expect(container).toBeEmptyDOMElement();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute("data-text-size", "125");
    expect(document.documentElement).toHaveAttribute("data-motion", "reduced");
  });
  it("re-applies when the appearance changes in this tab", async () => {
    render(<AppearanceApplier />);
    localStorage.setItem(
      "upsc.appearance",
      JSON.stringify({ theme: "dark", textSize: "100", highContrast: false, reducedMotion: false }),
    );
    window.dispatchEvent(new Event("upsc:appearance"));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});
