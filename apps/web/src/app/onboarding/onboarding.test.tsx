import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/onboarding/Wizard", () => ({ Wizard: () => <p>wizard</p> }));

import OnboardingLayout from "./layout";
import OnboardingPage from "./page";

describe("onboarding route", () => {
  it("uses a minimal layout: brand and content, no navigation or sidebar", () => {
    render(
      <OnboardingLayout>
        <OnboardingPage />
      </OnboardingLayout>,
    );
    expect(screen.getByText("wizard")).toBeInTheDocument();
    expect(screen.getByText("AI UPSC")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(document.querySelector("aside")).toBeNull();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
