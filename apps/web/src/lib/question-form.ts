import type { Difficulty, NewQuestion, OptionKey, QuestionAdminView, QuestionFormat, QuestionSourceType } from "./types";

export const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface QuestionFormValues {
  format: QuestionFormat;
  stem: string;
  statements: string[];
  options: Record<OptionKey, string>;
  correctOption: OptionKey | null;
  explanation: string;
  reasoning: Record<OptionKey, string>;
  misconceptionOption: OptionKey | "";
  misconceptionText: string;
  difficulty: Difficulty;
  subjectNodeId: string;
  topic: string;
  gsPaper: string;
  sourceType: QuestionSourceType;
  pyqYear: string;
  pyqPaper: string;
}

export function emptyForm(): QuestionFormValues {
  return {
    format: "single",
    stem: "",
    statements: [""],
    options: { A: "", B: "", C: "", D: "" },
    correctOption: null,
    explanation: "",
    reasoning: { A: "", B: "", C: "", D: "" },
    misconceptionOption: "",
    misconceptionText: "",
    difficulty: "medium",
    subjectNodeId: "",
    topic: "",
    gsPaper: "GS1",
    sourceType: "platform",
    pyqYear: "",
    pyqPaper: "",
  };
}

export function fromQuestion(q: QuestionAdminView): QuestionFormValues {
  const text = (k: OptionKey) => q.options.find((o) => o.key === k)?.text ?? "";
  return {
    format: q.format,
    stem: q.stem,
    statements: q.statements && q.statements.length ? q.statements : [""],
    options: { A: text("A"), B: text("B"), C: text("C"), D: text("D") },
    correctOption: q.correctOption,
    explanation: q.explanation,
    reasoning: {
      A: q.optionReasoning.A ?? "",
      B: q.optionReasoning.B ?? "",
      C: q.optionReasoning.C ?? "",
      D: q.optionReasoning.D ?? "",
    },
    misconceptionOption: q.misconception?.option ?? "",
    misconceptionText: q.misconception?.text ?? "",
    difficulty: q.difficulty,
    subjectNodeId: q.subjectNodeId,
    topic: q.topic ?? "",
    gsPaper: q.gsPaper,
    sourceType: q.sourceType,
    pyqYear: q.pyqYear == null ? "" : String(q.pyqYear),
    pyqPaper: q.pyqPaper ?? "",
  };
}

/** Mirrors the API rules (apps/api/src/practice/import.ts); keys are `field` or `options.A`. */
export function validateForm(v: QuestionFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.stem.trim()) e.stem = "Stem is required";
  else if (v.stem.trim().length > 2000) e.stem = "Stem must be 2000 characters or fewer";
  if (v.format === "statements") {
    const s = v.statements.map((x) => x.trim());
    if (s.length < 1 || s.length > 10 || s.some((x) => !x || x.length > 1000)) {
      e.statements = "Add at least one statement; none may be empty";
    }
  }
  for (const k of OPTION_KEYS) {
    const t = v.options[k].trim();
    if (!t) e[`options.${k}`] = `Option ${k} text is required`;
    else if (t.length > 500) e[`options.${k}`] = `Option ${k} must be 500 characters or fewer`;
  }
  if (!v.correctOption) e.correctOption = "Choose the correct option";
  if (v.explanation.trim().length > 5000) e.explanation = "Explanation must be 5000 characters or fewer";
  for (const k of OPTION_KEYS) {
    if (v.reasoning[k].trim().length > 1000) e[`reasoning.${k}`] = `Reasoning for ${k} must be 1000 characters or fewer`;
  }
  if (v.misconceptionOption && !v.misconceptionText.trim()) {
    e.misconceptionText = "Describe the misconception for the chosen option";
  }
  if (!v.misconceptionOption && v.misconceptionText.trim()) e.misconceptionOption = "Choose which option the misconception belongs to";
  if (!UUID.test(v.subjectNodeId.trim())) e.subjectNodeId = "Choose a subject or enter a valid syllabus node id";
  if (v.topic.trim().length > 200) e.topic = "Topic must be 200 characters or fewer";
  if (!v.gsPaper.trim()) e.gsPaper = "GS paper is required";
  else if (v.gsPaper.trim().length > 50) e.gsPaper = "GS paper must be 50 characters or fewer";
  if (v.pyqPaper.trim().length > 100) e.pyqPaper = "PYQ paper must be 100 characters or fewer";
  const y = v.pyqYear.trim();
  if (y) {
    const n = Number(y);
    if (!Number.isInteger(n) || n < 1950 || n > 2100) e.pyqYear = "Year must be between 1950 and 2100";
  }
  return e;
}

/** Body of POST /admin/questions; `statements` is omitted for the single format. */
export type QuestionBody = Omit<NewQuestion, "statements"> & { statements?: string[] | null };

/** Request body for POST/PATCH /admin/questions (call only after validateForm is clean). */
export function toBody(v: QuestionFormValues): QuestionBody {
  const optionReasoning: Partial<Record<OptionKey, string>> = {};
  for (const k of OPTION_KEYS) if (v.reasoning[k].trim()) optionReasoning[k] = v.reasoning[k].trim();
  const y = v.pyqYear.trim();
  return {
    format: v.format,
    stem: v.stem.trim(),
    ...(v.format === "statements" ? { statements: v.statements.map((s) => s.trim()) } : {}),
    options: OPTION_KEYS.map((key) => ({ key, text: v.options[key].trim() })),
    correctOption: v.correctOption as OptionKey,
    explanation: v.explanation.trim(),
    optionReasoning,
    misconception: v.misconceptionOption ? { option: v.misconceptionOption, text: v.misconceptionText.trim() } : null,
    difficulty: v.difficulty,
    subjectNodeId: v.subjectNodeId.trim(),
    topic: v.topic.trim() || null,
    gsPaper: v.gsPaper.trim(),
    sourceType: v.sourceType,
    pyqYear: y ? Number(y) : null,
    pyqPaper: v.pyqPaper.trim() || null,
  };
}

/**
 * PATCH body: only the fields that differ from the saved question (plus `reason` when the key changed).
 * Returns null when nothing changed. `statements` is sent as null when switching back to the single format.
 */
export function diffBody(v: QuestionFormValues, saved: QuestionAdminView, reason?: string): Record<string, unknown> | null {
  const next = toBody(v) as unknown as Record<string, unknown>;
  const prev = toBody(fromQuestion(saved)) as unknown as Record<string, unknown>;
  next.statements ??= null;
  prev.statements ??= null;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(next)) if (JSON.stringify(next[k]) !== JSON.stringify(prev[k])) out[k] = next[k];
  if (Object.keys(out).length === 0) return null;
  if ("correctOption" in out && reason) out.reason = reason;
  return out;
}

/** What a question still lacks before it can be published (API: 400 incomplete_question). */
export function publishBlockers(q: Pick<QuestionAdminView, "explanation" | "optionReasoning">): string[] {
  const out: string[] = [];
  if (!q.explanation?.trim()) out.push("explanation");
  for (const k of OPTION_KEYS) if (!q.optionReasoning?.[k]?.trim()) out.push(`reasoning for ${k}`);
  return out;
}

export interface ListFilters {
  status: string;
  subjectNodeId: string;
  sourceType: string;
  q: string;
}
export const PAGE_SIZE = 25;

export function buildListQuery(f: ListFilters, cursor?: string | null): string {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.subjectNodeId) p.set("subjectNodeId", f.subjectNodeId);
  if (f.sourceType) p.set("sourceType", f.sourceType);
  if (f.q.trim()) p.set("q", f.q.trim());
  p.set("limit", String(PAGE_SIZE));
  if (cursor) p.set("cursor", cursor);
  return p.toString();
}
