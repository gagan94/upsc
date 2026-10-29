import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
let params = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => params,
}));

const signInWithPassword = vi.fn();
const signInWithOAuth = vi.fn();
vi.mock("@/lib/supabase-browser", () => ({
  createBrowserSupabase: () => ({ auth: { signInWithPassword, signInWithOAuth } }),
}));

import LoginPage from "./page";

function fill(email = "a@b.co", password = "pw") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

beforeEach(() => {
  params = new URLSearchParams();
  replace.mockReset();
  signInWithPassword.mockReset();
  signInWithOAuth.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("LoginPage", () => {
  it("signs in and navigates to the return_to path", async () => {
    params = new URLSearchParams("return_to=/learn");
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginPage />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/learn"));
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.co", password: "pw" });
  });

  it("ignores an unsafe return_to", async () => {
    params = new URLSearchParams("return_to=//evil.com");
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginPage />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });

  it("shows invalid credentials, keeps the email", async () => {
    signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });
    render(<LoginPage />);
    fill("keep@me.co");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
    expect(screen.getByLabelText("Email")).toHaveValue("keep@me.co");
    expect(replace).not.toHaveBeenCalled();
  });

  it("disables the button while pending", async () => {
    let resolve!: (v: unknown) => void;
    signInWithPassword.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<LoginPage />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Log in|Logging in/ })).toBeDisabled());
    resolve({ error: null });
    await waitFor(() => expect(replace).toHaveBeenCalled());
  });

  it("shows oauth_failed error from the query string", () => {
    params = new URLSearchParams("error=oauth_failed");
    render(<LoginPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Google sign-in did not complete. Please try again.");
  });

  it("explains a rejected session from the query string", () => {
    params = new URLSearchParams("error=session_rejected");
    render(<LoginPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't verify your session. Please sign in again.");
  });

  it("hides Google button unless enabled", () => {
    render(<LoginPage />);
    expect(screen.queryByRole("button", { name: "Continue with Google" })).toBeNull();
  });

  it("starts Google OAuth with a safe redirectTo when enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_ENABLED", "true");
    signInWithOAuth.mockResolvedValue({ error: null });
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalled());
    const arg = signInWithOAuth.mock.calls[0][0];
    expect(arg.provider).toBe("google");
    expect(arg.options.redirectTo).toContain("/auth/callback?return_to=%2Fhome");
  });
});
