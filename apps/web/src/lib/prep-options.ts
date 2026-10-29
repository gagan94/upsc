import type { PrepPapers, PrepStage, StudyWindow } from "./types";

export const TARGET_YEAR_OPTIONS = [
  { value: "2027", label: "2027" },
  { value: "2028", label: "2028" },
  { value: "exploring", label: "Just exploring" },
];
export const STAGE_OPTIONS: { value: PrepStage; label: string }[] = [
  { value: "beginner", label: "Just starting" },
  { value: "preparing", label: "Preparing" },
  { value: "revision", label: "Revision" },
];
export const ATTEMPT_OPTIONS = [
  { value: "1", label: "First attempt" },
  { value: "2", label: "Second attempt" },
  { value: "3", label: "Third attempt" },
  { value: "4+", label: "Fourth or later" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
export const PAPER_OPTIONS: { value: PrepPapers; label: string }[] = [
  { value: "prelims", label: "Prelims" },
  { value: "mains", label: "Mains" },
  { value: "both", label: "Both" },
];
export const WINDOW_OPTIONS: { value: StudyWindow; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];
export const SUPPORT_OPTIONS = [
  { value: "study_plan", label: "A study plan" },
  { value: "practice_questions", label: "Practice questions" },
  { value: "answer_writing", label: "Answer-writing feedback" },
  { value: "current_affairs", label: "Current affairs" },
  { value: "mentor", label: "Mentor guidance" },
  { value: "revision", label: "Revision reminders" },
];

export function targetYearToValue(y: 2027 | 2028 | null | undefined): string | null {
  if (y === undefined) return null;
  return y === null ? "exploring" : String(y);
}
export function valueToTargetYear(v: string): 2027 | 2028 | null {
  return v === "2027" ? 2027 : v === "2028" ? 2028 : null;
}
