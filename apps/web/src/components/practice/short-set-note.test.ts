import { describe, expect, it } from "vitest";
import { shortSetSentence } from "./short-set-note";

describe("shortSetSentence (R18)", () => {
  it("rebuilds the sentence from the two integers", () => {
    expect(shortSetSentence("Started with 12 of 20 requested questions")).toBe(
      "Started with 12 of 20 requested questions. Not enough matching questions were available.",
    );
  });
  it("ignores anything that does not match exactly, never echoing it", () => {
    for (const bad of [undefined, "", "hello", "Started with 12 of 20 requested questions<img src=x>", "x Started with 1 of 2 requested questions", "Started with a of b requested questions"]) {
      expect(shortSetSentence(bad)).toBeNull();
    }
  });
  it("clamps to 1 <= got <= requested <= 50", () => {
    expect(shortSetSentence("Started with 0 of 20 requested questions")).toContain("Started with 1 of 20");
    expect(shortSetSentence("Started with 90 of 99 requested questions")).toContain("Started with 50 of 50");
    expect(shortSetSentence("Started with 30 of 20 requested questions")).toContain("Started with 20 of 20");
    expect(shortSetSentence(`Started with ${"9".repeat(400)} of 20 requested questions`)).toContain("Started with 20 of 20");
  });
});
