import { describe, expect, it } from "vitest";
import { formatDateLong, formatDuration, formatMinutes } from "./format";

describe("formatMinutes", () => {
  it("formats hours and minutes", () => {
    expect(formatMinutes(80)).toBe("1h 20m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(120)).toBe("2h");
  });
  it("rounds and clamps bad input", () => {
    expect(formatMinutes(44.6)).toBe("45m");
    expect(formatMinutes(-5)).toBe("0m");
    expect(formatMinutes(Number.NaN)).toBe("0m");
  });
});

describe("formatDuration", () => {
  it("formats mm:ss", () => {
    expect(formatDuration(22 * 60 + 14)).toBe("22:14");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(0)).toBe("0:00");
  });
  it("adds hours when needed", () => {
    expect(formatDuration(3600 + 125)).toBe("1:02:05");
  });
  it("clamps negatives", () => {
    expect(formatDuration(-3)).toBe("0:00");
  });
});

describe("formatDateLong", () => {
  it("formats an instant in the given zone", () => {
    expect(formatDateLong("2026-10-14T18:40:00Z", "Asia/Kolkata")).toBe("Thursday, 15 October 2026");
    expect(formatDateLong("2026-10-14T18:10:00Z", "Asia/Kolkata")).toBe("Wednesday, 14 October 2026");
  });
  it("treats a plain date as that calendar day", () => {
    expect(formatDateLong("2026-10-14", "Asia/Kolkata")).toBe("Wednesday, 14 October 2026");
    expect(formatDateLong("2026-10-14", "America/New_York")).toBe("Wednesday, 14 October 2026");
  });
});
