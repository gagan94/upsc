import { describe, expect, it } from "vitest";
import { buildListQuery, emptyForm, publishBlockers, toBody, validateForm, type QuestionFormValues } from "./question-form";

const ok = (): QuestionFormValues => ({
  ...emptyForm(),
  stem: "Which river is the longest in India?",
  options: { A: "Ganga", B: "Godavari", C: "Yamuna", D: "Krishna" },
  correctOption: "A",
  difficulty: "easy",
  subjectNodeId: "0190b3a0-0000-7000-8000-000000000001",
  gsPaper: "GS1",
});

describe("validateForm", () => {
  it("accepts a complete single-format question", () => {
    expect(validateForm(ok())).toEqual({});
  });
  it("requires four non-empty options and a correct choice", () => {
    const v = { ...ok(), options: { A: "Ganga", B: " ", C: "", D: "Krishna" }, correctOption: null };
    const e = validateForm(v);
    expect(e["options.B"]).toBe("Option B text is required");
    expect(e["options.C"]).toBe("Option C text is required");
    expect(e["options.A"]).toBeUndefined();
    expect(e.correctOption).toBe("Choose the correct option");
  });
  it("requires statements for the statements format", () => {
    expect(validateForm({ ...ok(), format: "statements", statements: [""] }).statements).toBe("Add at least one statement; none may be empty");
    expect(validateForm({ ...ok(), format: "statements", statements: ["S1"] }).statements).toBeUndefined();
  });
  it("requires a valid node id, stem, GS paper; PYQ year range; misconception text", () => {
    const e = validateForm({ ...ok(), stem: "", gsPaper: "", subjectNodeId: "abc", sourceType: "pyq", pyqYear: "1900", misconceptionOption: "B", misconceptionText: "" });
    expect(e.stem).toBeDefined();
    expect(e.gsPaper).toBeDefined();
    expect(e.subjectNodeId).toBe("Choose a subject or enter a valid syllabus node id");
    expect(e.pyqYear).toBe("Year must be between 1950 and 2100");
    expect(e.misconceptionText).toBe("Describe the misconception for the chosen option");
  });
});

describe("toBody", () => {
  it("omits statements for single, drops empty reasoning, nulls blanks", () => {
    const body = toBody({ ...ok(), explanation: " Because. ", reasoning: { A: "yes", B: "", C: "", D: "" }, topic: " " });
    expect(body).toMatchObject({
      format: "single",
      statements: undefined,
      explanation: "Because.",
      optionReasoning: { A: "yes" },
      misconception: null,
      topic: null,
      sourceType: "platform",
      pyqYear: null,
      pyqPaper: null,
    });
    expect(body.options).toEqual([
      { key: "A", text: "Ganga" },
      { key: "B", text: "Godavari" },
      { key: "C", text: "Yamuna" },
      { key: "D", text: "Krishna" },
    ]);
  });
});

describe("publishBlockers", () => {
  it("lists missing explanation and per-option reasoning", () => {
    expect(publishBlockers({ explanation: "", optionReasoning: { A: "x" } })).toEqual([
      "explanation",
      "reasoning for B",
      "reasoning for C",
      "reasoning for D",
    ]);
    expect(publishBlockers({ explanation: "e", optionReasoning: { A: "a", B: "b", C: "c", D: "d" } })).toEqual([]);
  });
});

describe("buildListQuery", () => {
  it("includes only set filters, then limit and encoded cursor", () => {
    expect(buildListQuery({ status: "all", subjectNodeId: "", sourceType: "", q: "" })).toBe("status=all&limit=25");
    expect(
      buildListQuery({ status: "draft", subjectNodeId: "n1", sourceType: "pyq", q: " river & lake " }, "c 1"),
    ).toBe("status=draft&subjectNodeId=n1&sourceType=pyq&q=river+%26+lake&limit=25&cursor=c+1");
  });
});
