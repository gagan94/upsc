import type { QuestionFeedback } from "@/lib/types";

/** Rendered only in learning mode, from a PUT response or a restored session, for an already-answered question. */
export function LearningFeedback({ feedback }: { feedback: QuestionFeedback }) {
  return (
    <section aria-label="Answer feedback" className="rounded-card border border-border bg-surface p-4">
      <h3 className={`text-base font-bold ${feedback.correct ? "text-primary" : "text-danger"}`}>{feedback.correct ? "Correct" : "Not quite"}</h3>
      <p className="mt-1 text-sm font-semibold text-text">{`Correct answer: ${feedback.correctOption}`}</p>
      <p className="mt-2 whitespace-pre-line text-sm text-text">{feedback.explanation}</p>
    </section>
  );
}
