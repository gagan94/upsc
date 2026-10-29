import { describe, expect, it } from "vitest";
import { localDate, startOfWeek } from "./time";

describe("localDate", () => {
  it("uses the zone's calendar day", () => {
    expect(localDate(new Date("2026-10-14T18:10:00Z"), "Asia/Kolkata")).toBe("2026-10-14");
    expect(localDate(new Date("2026-10-14T18:40:00Z"), "Asia/Kolkata")).toBe("2026-10-15");
    expect(localDate(new Date("2026-10-14T02:00:00Z"), "America/New_York")).toBe("2026-10-13");
  });
});

describe("startOfWeek", () => {
  it("Monday start", () => {
    expect(startOfWeek("2026-10-14", "monday")).toBe("2026-10-12");
    expect(startOfWeek("2026-10-12", "monday")).toBe("2026-10-12");
    expect(startOfWeek("2026-10-18", "monday")).toBe("2026-10-12");
  });
  it("Sunday start", () => {
    expect(startOfWeek("2026-10-14", "sunday")).toBe("2026-10-11");
    expect(startOfWeek("2026-10-11", "sunday")).toBe("2026-10-11");
    expect(startOfWeek("2026-10-17", "sunday")).toBe("2026-10-11");
  });
  it("crosses month and year boundaries", () => {
    expect(startOfWeek("2027-01-01", "monday")).toBe("2026-12-28");
  });
});
