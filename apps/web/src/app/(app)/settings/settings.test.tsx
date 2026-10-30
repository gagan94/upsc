import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (...a: unknown[]) => apiFetch(...a) }));
let pathname = "/settings/profile";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  redirect: (u: string) => {
    throw new Error(`NEXT_REDIRECT:${u}`);
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));
const serverApi = vi.fn();
vi.mock("@/lib/server-api", () => ({ serverApi: (...a: unknown[]) => serverApi(...a) }));

import { AccountPanel } from "@/components/settings/AccountPanel";
import { AppearanceForm } from "@/components/settings/AppearanceForm";
import { PreparationForm } from "@/components/settings/PreparationForm";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { StudyPrefsForm } from "@/components/settings/StudyPrefsForm";
import SettingsIndexPage from "./page";
import ProfilePage from "./profile/page";
import StudyPage from "./study/page";
import PreparationPage from "./preparation/page";

const profile = { name: "Asha", email: "a@x.co", bio: null, location: "Delhi", timezone: "Asia/Kolkata" };

beforeEach(() => {
  apiFetch.mockReset();
  serverApi.mockReset();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  pathname = "/settings/profile";
});

describe("ProfileForm", () => {
  it("submits PATCH /me with only the changed fields and shows a success banner", async () => {
    apiFetch.mockResolvedValue({ user: {} });
    render(<ProfileForm initial={profile} />);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Asha K" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Profile saved"));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [path, init] = apiFetch.mock.calls[0];
    expect(path).toBe("/me");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ name: "Asha K" });
    // saved values become the new baseline: nothing left to save
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
  it("clears optional fields with null and sends a changed timezone", async () => {
    apiFetch.mockResolvedValue({ user: {} });
    render(<ProfileForm initial={profile} />);
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Time zone"), { target: { value: "UTC" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ location: null, timezone: "UTC" });
  });
  it("shows an error banner and keeps the entered values on API failure", async () => {
    apiFetch.mockRejectedValue(new ApiError(400, "validation_failed", "Bad timezone"));
    render(<ProfileForm initial={profile} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not save your changes. Bad timezone"));
    expect(screen.getByLabelText("Name")).toHaveValue("New");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });
  it("validates the name before calling the API", () => {
    render(<ProfileForm initial={profile} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your name");
    expect(apiFetch).not.toHaveBeenCalled();
  });
  it("only offers valid IANA zones through a select, so an invalid zone cannot be chosen", () => {
    render(<ProfileForm initial={profile} />);
    const select = screen.getByLabelText("Time zone");
    expect(select.tagName).toBe("SELECT");
    const values = within(select).getAllByRole("option").map((o) => (o as HTMLOptionElement).value);
    expect(values).toContain("Asia/Kolkata");
    expect(values).not.toContain("Mars/Base");
    for (const v of values) expect(() => new Intl.DateTimeFormat("en", { timeZone: v })).not.toThrow();
  });
  it("keeps the current zone selectable even if the platform list lacks it", () => {
    render(<ProfileForm initial={{ ...profile, timezone: "Asia/Calcutta" }} />);
    expect(screen.getByLabelText("Time zone")).toHaveValue("Asia/Calcutta");
  });
});

describe("PreparationForm", () => {
  const initial = { targetYear: 2027 as const, stage: "preparing" as const, attempt: null, focus: { papers: "prelims" as const, subjects: [] } };
  const subjects = [{ id: "1", slug: "polity", title: "Polity", gsPaper: "GS2", syllabusNodeId: "n1", moduleCount: 1, lessonCount: 1 }];
  it("PUTs the full profile", async () => {
    apiFetch.mockResolvedValue({});
    render(<PreparationForm initial={initial} subjects={subjects} />);
    fireEvent.click(screen.getByRole("radio", { name: "2028" }));
    fireEvent.click(screen.getByRole("button", { name: "Polity" }));
    fireEvent.change(screen.getByLabelText("Attempt (optional)"), { target: { value: "prefer_not_to_say" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
    const [path, init] = apiFetch.mock.calls[0];
    expect(path).toBe("/me/preparation-profile");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({
      targetYear: 2028,
      stage: "preparing",
      attempt: "prefer_not_to_say",
      focus: { papers: "prelims", subjects: ["polity"] },
    });
  });
  it("sends targetYear null for Just exploring and requires a stage", async () => {
    apiFetch.mockResolvedValue({});
    render(<PreparationForm initial={{ ...initial, stage: null }} subjects={subjects} />);
    fireEvent.click(screen.getByRole("radio", { name: "Just exploring" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose your stage");
    expect(apiFetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "Revision" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(JSON.parse(apiFetch.mock.calls[0][1].body).targetYear).toBeNull();
  });
  it("tells the user when the subject list could not load", () => {
    render(<PreparationForm initial={initial} subjects={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load the subject list");
  });
});

describe("StudyPrefsForm", () => {
  const initial = { dailyGoalMin: 240, weeklyGoalMin: 1680, windows: ["evening" as const], weekStart: "monday" as const, defaultSessionMin: 25, remindersEnabled: false };
  it("PUTs study preferences", async () => {
    apiFetch.mockResolvedValue({});
    render(<StudyPrefsForm initial={initial} />);
    fireEvent.change(screen.getByLabelText("Daily goal (minutes)"), { target: { value: "180" } });
    fireEvent.click(screen.getByRole("button", { name: "Morning" }));
    fireEvent.change(screen.getByLabelText("Week starts on"), { target: { value: "sunday" } });
    fireEvent.change(screen.getByLabelText("Default session length"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("saved"));
    expect(apiFetch.mock.calls[0][0]).toBe("/me/study-preferences");
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({
      dailyGoalMin: 180,
      weeklyGoalMin: 1680,
      windows: ["evening", "morning"],
      weekStart: "sunday",
      defaultSessionMin: 45,
      remindersEnabled: false,
    });
  });
  it("blocks out-of-range goals and daily above weekly", () => {
    render(<StudyPrefsForm initial={initial} />);
    fireEvent.change(screen.getByLabelText("Daily goal (minutes)"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Enter 30 to 960 minutes")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Daily goal (minutes)"), { target: { value: "600" } });
    fireEvent.change(screen.getByLabelText("Weekly goal (minutes)"), { target: { value: "300" } });
    expect(screen.getByText("Weekly goal must be at least your daily goal")).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });
  it("shows API errors", async () => {
    apiFetch.mockRejectedValue(new ApiError(0, "network_error", "Network request failed"));
    render(<StudyPrefsForm initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not save your changes"));
  });
});

describe("AppearanceForm", () => {
  it("writes localStorage and sets data-theme and other attributes", () => {
    render(<AppearanceForm />);
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(JSON.parse(localStorage.getItem("upsc.appearance")!).theme).toBe("dark");
    fireEvent.click(screen.getByRole("radio", { name: "125%" }));
    expect(document.documentElement).toHaveAttribute("data-text-size", "125");
    fireEvent.click(screen.getByLabelText(/High contrast/));
    expect(document.documentElement).toHaveAttribute("data-contrast", "high");
    fireEvent.click(screen.getByLabelText(/Reduce motion/));
    expect(document.documentElement).toHaveAttribute("data-motion", "reduced");
    expect(JSON.parse(localStorage.getItem("upsc.appearance")!)).toEqual({
      theme: "dark",
      textSize: "125",
      highContrast: true,
      reducedMotion: true,
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });
  it("starts from the stored settings", () => {
    localStorage.setItem("upsc.appearance", JSON.stringify({ theme: "dark", textSize: "112", highContrast: false, reducedMotion: false }));
    render(<AppearanceForm />);
    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "112%" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("AccountPanel", () => {
  it("shows a read-only email and a Log out link to the signout route", () => {
    render(<AccountPanel email="a@x.co" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Email")).toHaveValue("a@x.co");
    expect(screen.getByRole("link", { name: "Log out" })).toHaveAttribute("href", "/auth/signout?done=1");
  });
});

describe("SettingsNav", () => {
  it("lists the five sections and marks the current one", () => {
    render(<SettingsNav />);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.getByRole("link", { name: "My profile" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Account & contact" })).not.toHaveAttribute("aria-current");
  });
});

describe("settings index", () => {
  it("links the five sections and marks the rest as arriving later", async () => {
    render(await SettingsIndexPage({ searchParams: Promise.resolve({}) }));
    for (const l of ["My profile", "Preparation profile", "Study preferences", "Appearance & accessibility", "Account & contact"]) {
      expect(screen.getByRole("link", { name: l })).toBeInTheDocument();
    }
    for (const l of ["Notifications", "Connected tools", "Privacy & data"]) {
      const item = screen.getByText(l).closest("li")!;
      expect(item).toHaveTextContent("Arrives in a later phase");
      expect(within(item).queryByRole("link")).toBeNull();
    }
  });
  it("redirects legacy ?section= links", async () => {
    await expect(SettingsIndexPage({ searchParams: Promise.resolve({ section: "study" }) })).rejects.toThrow("NEXT_REDIRECT:/settings/study");
  });
});

describe("settings pages", () => {
  it("profile page renders the form from the server profile", async () => {
    serverApi.mockResolvedValue(profile);
    render(await ProfilePage());
    expect(serverApi).toHaveBeenCalledWith("/me/profile");
    expect(screen.getByLabelText("Name")).toHaveValue("Asha");
  });
  it("redirects to login on 401", async () => {
    serverApi.mockRejectedValue(new ApiError(401, "unauthenticated", "no"));
    await expect(StudyPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });
  it("shows an error panel with retry on API failure", async () => {
    serverApi.mockRejectedValue(new ApiError(500, "internal", "boom"));
    render(await StudyPage());
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load");
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/settings/study");
  });
  it("preparation page still renders when only the subject list fails", async () => {
    serverApi.mockImplementation(async (p: string) => {
      if (p === "/learn/subjects") throw new ApiError(500, "internal", "x");
      return { targetYear: null, stage: "beginner", attempt: null, focus: {} };
    });
    render(await PreparationPage());
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load the subject list");
  });
});
