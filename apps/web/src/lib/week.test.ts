import { describe, expect, it } from "vitest";
import { monthGrid, weekDays } from "./week";

describe("weekDays", () => {
  it("returns seven consecutive days", () => {
    expect(weekDays("2026-10-12")).toEqual([
      "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
    ]);
  });
  it("crosses month end", () => {
    expect(weekDays("2026-10-28").slice(3)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"]);
  });
});

describe("monthGrid", () => {
  it("Oct 2026 starts on Thursday for Monday-start weeks", () => {
    const g = monthGrid(2026, 10, "monday");
    expect(g[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(g).toHaveLength(5);
    expect(g[4]).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", null]);
    expect(g.every((r) => r.length === 7)).toBe(true);
  });
  it("Sunday start shifts the first row", () => {
    const g = monthGrid(2026, 10, "sunday");
    expect(g[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
  });
  it("handles February in a leap year", () => {
    const days = monthGrid(2028, 2, "monday").flat().filter(Boolean);
    expect(days).toHaveLength(29);
    expect(days[28]).toBe("2028-02-29");
  });
  it("can need six rows", () => {
    expect(monthGrid(2026, 3, "sunday")).toHaveLength(5);
    expect(monthGrid(2026, 8, "monday")).toHaveLength(6);
  });
});
