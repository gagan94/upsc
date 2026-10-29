import { describe, expect, it } from "vitest";
import type { ReportType } from "./types";

describe("ReportType", () => {
  it("is the closed set of report reasons", () => {
    const all: ReportType[] = ["wrong_key", "typo", "ambiguous", "other"];
    // @ts-expect-error not a report type
    const bad: ReportType = "bogus";
    expect(all).toHaveLength(4);
    expect(bad).toBe("bogus");
  });
});
