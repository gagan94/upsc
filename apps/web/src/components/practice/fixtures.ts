import type { AttemptSummary, PracticeSubject } from "@/lib/types";

export const polity: PracticeSubject = { id: "11111111-1111-4111-8111-111111111111", title: "Indian Polity", gsPaper: "GS II", publishedCount: 30, pyqVerifiedCount: 0 };
export const history: PracticeSubject = { id: "22222222-2222-4222-8222-222222222222", title: "Modern History", gsPaper: "GS I", publishedCount: 12, pyqVerifiedCount: 0 };
export const subjects: PracticeSubject[] = [polity, history];

export const attempt = (over: Partial<AttemptSummary> = {}): AttemptSummary => ({
  id: "a1",
  kind: "practice",
  mode: "test",
  submittedAt: "2026-10-14T06:30:00.000Z",
  total: 10,
  correct: 6,
  accuracy: 0.75,
  score: 10.68,
  title: "Indian Polity practice",
  ...over,
});
