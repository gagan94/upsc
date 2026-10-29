import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => params,
}));

const signUp = vi.fn();
vi.mock("@/lib/supabase-browser", () => ({
  createBrowserSupabase: () => ({ auth: { signUp, signInWithOAuth: vi.fn() } }),
}));

const apiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));

import SignupPage from "./page";

async function submit() {
  render(<SignupPage />);
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Asha" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-long-password-1" } });
  fireEvent.click(screen.getByLabelText("Accept terms and privacy"));
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

beforeEach(() => {
  params = new URLSearchParams();
  replace.mockReset();
  signUp.mockReset();
  apiFetch.mockReset();
  signUp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
});

describe("SignupPage success path", () => {
  it("sends a not_started user to /onboarding", async () => {
    apiFetch.mockResolvedValue({ status: "not_started", step: 0, answers: {} });
    await submit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
    expect(apiFetch).toHaveBeenCalledWith("/me/onboarding");
  });
  it("sends everyone else to the safe return_to / home", async () => {
    params = new URLSearchParams("return_to=/learn");
    apiFetch.mockResolvedValue({ status: "completed", step: 5, answers: {} });
    await submit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/learn"));
  });
  it("goes to /home when the onboarding lookup fails", async () => {
    params = new URLSearchParams("return_to=//evil.com");
    apiFetch.mockRejectedValue(new Error("down"));
    await submit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });
});
