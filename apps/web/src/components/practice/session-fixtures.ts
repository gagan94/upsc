import type { Confidence, OptionKey, PracticeQuestionView, PracticeSessionDetail, PracticeMode } from "@/lib/types";

export const SESSION_ID = "33333333-3333-4333-8333-333333333333";

export const question = (ordinal: number, over: Partial<PracticeQuestionView> = {}): PracticeQuestionView => ({
  ordinal,
  questionId: `q-${ordinal}`,
  format: "single",
  stem: `Stem of question ${ordinal}`,
  statements: null,
  options: (["A", "B", "C", "D"] as OptionKey[]).map((key) => ({ key, text: `Option ${key} of ${ordinal}` })),
  selected: null,
  flagged: false,
  confidence: null as Confidence | null,
  ...over,
});

/** A session payload exactly as the API returns it for an open session: no answer keys in test mode. */
export const detail = (
  over: { mode?: PracticeMode; timed?: boolean; remainingSeconds?: number | null; total?: number; questions?: PracticeQuestionView[] } = {},
): PracticeSessionDetail => {
  const total = over.total ?? 4;
  const timed = over.timed ?? true;
  return {
    session: {
      id: SESSION_ID,
      mode: over.mode ?? "test",
      timed,
      status: "in_progress",
      endsAt: timed ? "2026-10-30T10:00:00.000Z" : null,
      remainingSeconds: timed ? (over.remainingSeconds ?? 1334) : null,
      total,
    },
    questions: over.questions ?? Array.from({ length: total }, (_, i) => question(i + 1, i === 1 ? { statements: ["Statement one", "Statement two"], format: "statements" } : {})),
  };
};
