import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./safe-redirect";

describe("safeReturnTo", () => {
  it("keeps same-origin paths", () => {
    expect(safeReturnTo("/learn")).toBe("/learn");
    expect(safeReturnTo("/learn?x=1")).toBe("/learn?x=1");
  });
  it("falls back for empty values", () => {
    expect(safeReturnTo(null)).toBe("/home");
    expect(safeReturnTo(undefined)).toBe("/home");
    expect(safeReturnTo("", "/x")).toBe("/x");
  });
  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "/%0d%0a", "/a\r\nb", "learn"])(
    "rejects %s",
    (raw) => {
      expect(safeReturnTo(raw)).toBe("/home");
    },
  );
});
