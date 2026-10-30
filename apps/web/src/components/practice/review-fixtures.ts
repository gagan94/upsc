import type { OptionKey, PracticeResults, QuestionReview } from "@/lib/types";

export const RESULTS_SESSION_ID = "44444444-4444-4444-8444-444444444444";

type RQ = PracticeResults["questions"][number];
const rq = (ordinal: number, over: Partial<RQ> = {}): RQ => ({
  ordinal,
  questionId: `q-${ordinal}`,
  selected: "A",
  correctOption: "A",
  correct: true,
  flagged: false,
  bookmarked: false,
  ...over,
});

/** 5 questions: 1 correct, 2 incorrect (one bookmarked), 1 skipped, 1 correct. */
export const results = (over: Partial<PracticeResults> = {}): PracticeResults => ({
  session: { mode: "test", status: "submitted", submittedAt: "2026-10-30T06:30:00.000Z", timeTakenSeconds: 1334, total: 5 },
  score: 3.34,
  accuracy: 0.6667,
  correct: 2,
  incorrect: 2,
  skipped: 1,
  byTopic: [
    { subjectNodeId: "11111111-1111-4111-8111-111111111111", title: "Indian Polity", correct: 1, total: 3 },
    { subjectNodeId: "22222222-2222-4222-8222-222222222222", title: "Modern History", correct: 1, total: 2 },
  ],
  questions: [
    rq(1),
    rq(2, { selected: "B", correct: false }),
    rq(3, { selected: null, correct: null }),
    rq(4, { selected: "C", correct: false, bookmarked: true }),
    rq(5),
  ],
  nextAction: { kind: "practise_weak_topic", label: "Practise Indian Polity", subjectNodeId: "11111111-1111-4111-8111-111111111111" },
  ...over,
});

export const review = (over: Partial<QuestionReview> = {}): QuestionReview => ({
  question: {
    stem: "Which article deals with the right to equality?",
    statements: null,
    options: (["A", "B", "C", "D"] as OptionKey[]).map((key) => ({ key, text: `Choice ${key}` })),
    format: "single",
    difficulty: "medium",
    topic: "Fundamental Rights",
    isSample: true,
  },
  yourAnswer: "B",
  correctOption: "A",
  correct: false,
  confidence: "sure",
  timeMs: 42000,
  explanation: "Article 14 guarantees equality before the law.",
  optionReasoning: { A: "Matches Article 14.", B: "That is about religion.", C: "That is about speech.", D: "That is about property." },
  misconception: { option: "B", text: "Mixing up Articles 14 and 25." },
  othersAnswered: { sample: 10, pctByOption: null },
  bookmarked: false,
  reasoningText: null,
  ...over,
});
