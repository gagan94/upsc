import type { Marking } from '../db/schema/practice';

/** GS Paper I: +2 correct, -0.66 wrong, 0 skipped (spec 08 FR-08-13). */
export const DEFAULT_MARKING: Marking = { correct: 2, incorrect: -0.66 };
/** Default time allowance per question for timed sessions. */
export const SECONDS_PER_QUESTION = 72;

export type ScoringMode = 'learning' | 'test';

export interface ScoreResult {
  correct: number;
  incorrect: number;
  skipped: number;
  /** Null in learning mode: learning sets report accuracy only. */
  score: number | null;
  /** correct / attempted; 0 when nothing was attempted. */
  accuracy: number;
  perQuestion: { correct: boolean | null; marks: number }[];
}

const round2 = (x: number): number => Math.round(x * 100 + (x >= 0 ? 1e-9 : -1e-9)) / 100;

/** Pure scoring of one session. A null `selected` is a skip (0 marks, not attempted). */
export function scoreAnswers(
  answers: { selected: string | null; correctOption: string }[],
  marking: Marking,
  mode: ScoringMode,
): ScoreResult {
  let correct = 0;
  let incorrect = 0;
  let total = 0;
  const perQuestion = answers.map((a) => {
    if (a.selected === null) return { correct: null, marks: 0 };
    const ok = a.selected === a.correctOption;
    if (ok) correct += 1;
    else incorrect += 1;
    const marks = mode === 'test' ? (ok ? marking.correct : marking.incorrect) : 0;
    total += marks;
    return { correct: ok, marks };
  });
  const attempted = correct + incorrect;
  return {
    correct,
    incorrect,
    skipped: answers.length - attempted,
    score: mode === 'test' ? round2(total) : null,
    accuracy: attempted === 0 ? 0 : correct / attempted,
    perQuestion,
  };
}
