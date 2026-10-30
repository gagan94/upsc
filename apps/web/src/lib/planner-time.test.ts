import { describe, expect, it } from "vitest";
import { formatTimeLabel, localTime, zonedInstant } from "./planner-time";

describe("planner-time", () => {
  it("converts a wall-clock time in IST to the right instant", () => {
    expect(zonedInstant("2026-10-14", "23:30", "Asia/Kolkata")).toBe("2026-10-14T18:00:00.000Z");
    expect(zonedInstant("2026-10-15", "00:10", "Asia/Kolkata")).toBe("2026-10-14T18:40:00.000Z");
  });
  it("handles zones west of UTC with DST", () => {
    expect(zonedInstant("2026-07-01", "09:00", "America/New_York")).toBe("2026-07-01T13:00:00.000Z");
    expect(zonedInstant("2026-12-01", "09:00", "America/New_York")).toBe("2026-12-01T14:00:00.000Z");
  });
  it("reads an instant back in the user's zone", () => {
    expect(localTime("2026-10-14T18:00:00.000Z", "Asia/Kolkata")).toBe("23:30");
    expect(formatTimeLabel("2026-10-14T18:00:00.000Z", "Asia/Kolkata").toLowerCase()).toBe("11:30 pm");
  });
});
