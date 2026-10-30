import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAppearance, DEFAULT_APPEARANCE, readAppearance, writeAppearance } from "./appearance";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-text-size");
  document.documentElement.removeAttribute("data-contrast");
  document.documentElement.removeAttribute("data-motion");
});

describe("appearance storage", () => {
  it("returns defaults when nothing is stored", () => {
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
  });
  it("round-trips through localStorage", () => {
    const a = { theme: "dark", textSize: "125", highContrast: true, reducedMotion: true } as const;
    writeAppearance(a);
    expect(readAppearance()).toEqual(a);
  });
  it("ignores corrupt or invalid stored values", () => {
    localStorage.setItem("upsc.appearance", "{not json");
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
    localStorage.setItem("upsc.appearance", JSON.stringify({ theme: "neon", textSize: "999", highContrast: "yes" }));
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
  });
  it("does not throw when storage is unavailable", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readAppearance()).toEqual(DEFAULT_APPEARANCE);
    expect(() => writeAppearance(DEFAULT_APPEARANCE)).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});

describe("applyAppearance", () => {
  it("sets attributes on <html>", () => {
    applyAppearance({ theme: "dark", textSize: "112", highContrast: true, reducedMotion: true });
    const root = document.documentElement;
    expect(root).toHaveAttribute("data-theme", "dark");
    expect(root).toHaveAttribute("data-text-size", "112");
    expect(root).toHaveAttribute("data-contrast", "high");
    expect(root).toHaveAttribute("data-motion", "reduced");
  });
  it("clears contrast and motion attributes when off", () => {
    applyAppearance({ theme: "light", textSize: "100", highContrast: true, reducedMotion: true });
    applyAppearance(DEFAULT_APPEARANCE);
    expect(document.documentElement).not.toHaveAttribute("data-contrast");
    expect(document.documentElement).not.toHaveAttribute("data-motion");
  });
  it("resolves system theme from prefers-color-scheme", () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes("dark"), addEventListener() {}, removeEventListener() {} })) as never;
    applyAppearance({ ...DEFAULT_APPEARANCE, theme: "system" });
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});
