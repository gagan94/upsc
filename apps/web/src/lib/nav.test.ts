import { describe, expect, it } from "vitest";
import { FOOTER_ITEMS, NAV_GROUPS } from "./nav";

describe("nav", () => {
  it("has the groups in order", () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual([
      "Overview",
      "Study",
      "Current Affairs",
      "Practice",
      "Plan & Track",
      "Community",
    ]);
  });

  it("has the exact item labels per group", () => {
    expect(NAV_GROUPS.map((g) => g.items.map((i) => i.label))).toEqual([
      ["Home"],
      ["Learn", "Notes", "Revision"],
      ["Current Affairs", "Magazines & Resources", "Acts & Bills"],
      ["Prelims", "Mains"],
      ["Planner", "Progress", "Ask AI"],
      ["Forum", "Mentorship"],
    ]);
  });

  it("has unique hrefs starting with /", () => {
    const all = [...NAV_GROUPS.flatMap((g) => g.items), ...FOOTER_ITEMS];
    const hrefs = all.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const h of hrefs) expect(h.startsWith("/")).toBe(true);
    expect(new Set(all.map((i) => i.key)).size).toBe(all.length);
  });

  it("has footer items", () => {
    expect(FOOTER_ITEMS.map((i) => i.label)).toEqual(["Help & Resources", "Profile & Settings"]);
  });

  it("has phases between 0 and 9", () => {
    for (const i of [...NAV_GROUPS.flatMap((g) => g.items), ...FOOTER_ITEMS]) {
      expect(i.phase).toBeGreaterThanOrEqual(0);
      expect(i.phase).toBeLessThanOrEqual(9);
    }
  });
});
