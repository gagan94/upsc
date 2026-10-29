export interface UserView {
  id: string;
  email: string;
  name: string;
  roles: string[];
  timezone: string;
  locale: string;
}

export interface SubjectSummary {
  id: string;
  slug: string;
  title: string;
  gsPaper: string;
  moduleCount: number;
  lessonCount: number;
}

/* ------------------------------------------------------------------ *
 * Phase 1 API view types (Tasks 2-9 of the Phase 1 plan).
 * Instants/dates are ISO strings; nullable fields are `T | null`.
 * ------------------------------------------------------------------ */

export type WeekStart = "monday" | "sunday";
export type StudyWindow = "morning" | "afternoon" | "evening" | "night";
export type OptionKey = "A" | "B" | "C" | "D";

/** GET /me/profile */
export interface ProfileView {
  name: string;
  email: string;
  bio: string | null;
  location: string | null;
  timezone: string;
}
/** PATCH /me body */
export interface ProfilePatch {
  name?: string;
  bio?: string | null;
  location?: string | null;
  timezone?: string;
}

export type PrepStage = "beginner" | "preparing" | "revision";
export type PrepPapers = "prelims" | "mains" | "both";
export type OnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";

/** GET|PUT /me/preparation-profile */
export interface PrepProfileView {
  targetYear: 2027 | 2028 | null;
  stage: PrepStage | null;
  attempt: string | null;
  focus: { papers?: PrepPapers; subjects?: string[] };
}

/** GET|PUT /me/study-preferences */
export interface StudyPrefsView {
  dailyGoalMin: number;
  weeklyGoalMin: number;
  windows: StudyWindow[];
  weekStart: WeekStart;
  defaultSessionMin: number;
  remindersEnabled: boolean;
}

/* ---- Planner ---- */
export type ActivityType =
  | "reading"
  | "revision"
  | "practice_mcq"
  | "answer_writing"
  | "current_affairs"
  | "notes"
  | "mock_test"
  | "mentor_session"
  | "other";
export type TaskPriority = "low" | "normal" | "high";
export type TaskStatus = "todo" | "in_progress" | "completed" | "skipped";
export type TaskSource = "manual" | "starter_plan" | "system" | "seed";

export interface TaskLink {
  type: "practice_set" | "lesson" | "note";
  id?: string;
  href?: string;
}

export interface TaskView {
  id: string;
  title: string;
  subjectNodeId: string | null;
  subjectTitle: string | null;
  activityType: ActivityType;
  durationMin: number | null;
  scheduledStart: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt: string | null;
  actualMin: number | null;
  source: TaskSource;
  linked: TaskLink | null;
  notes: string | null;
}

/** POST /planner/tasks body (also the starter-plan preview item). */
export interface NewTask {
  title: string;
  subjectNodeId?: string | null;
  activityType?: ActivityType;
  durationMin?: number | null;
  scheduledStart?: string | null;
  priority?: TaskPriority;
  linked?: TaskLink | null;
  notes?: string | null;
}

/** GET /planner/today */
export interface TodayView {
  date: string;
  tasks: TaskView[];
  overdue: TaskView[];
  stats: { plannedMin: number; recordedMin: number; completed: number; total: number };
  unscheduledCount: number;
  overloaded: boolean;
}

/* ---- Study sessions ---- */
export interface StudySessionView {
  id: string;
  status: "running" | "paused" | "ended" | "discarded";
  plannedMin: number;
  startedAt: string;
  activeSeconds: number;
  pausedSeconds: number;
  taskId: string | null;
  subjectNodeId: string | null;
  stale: boolean;
}
/** GET /study-sessions (ended sessions) */
export interface EndedStudySessionView extends StudySessionView {
  endedAt?: string | null;
  endReason?: "target_reached" | "user" | null;
  focusRating?: number | null;
  notes?: string | null;
}

/* ---- Goals, progress, home ---- */
export interface GoalsView {
  dailyMin: number;
  weeklyMin: number;
  monthlyMilestone: string | null;
  milestoneDate: string | null;
  subjectTargets: { subjectNodeId: string; weeklyMin: number }[];
}

export interface ProgressView {
  weekStart: string;
  days: { date: string; recordedMin: number; plannedMin: number; tasksDone: number; tasksTotal: number }[];
  totals: { recordedMin: number; plannedMin: number; goalMin: number; tasksDone: number; tasksTotal: number };
  subjects: {
    subjectNodeId: string;
    title: string;
    plannedMin: number;
    recordedMin: number;
    targetMin: number | null;
  }[];
}

export interface ExamDateView {
  exam: "prelims" | "mains";
  year: number;
  date: string;
  status: "illustrative" | "confirmed";
}

export interface HomeView {
  onboarding: { status: OnboardingStatus; step: number };
  countdown: { exam: "prelims" | "mains"; year: number; date: string; daysLeft: number; illustrative: boolean }[];
  plan: { done: number; total: number; tasks: TaskView[] };
  week: { recordedMin: number; goalMin: number; tasksDone: number; tasksTotal: number; streakDays: number };
  practice: {
    recentSessions: { id: string; title: string; accuracy: number | null; submittedAt: string }[];
    mistakesCount: number;
    bookmarksCount: number;
  };
}

/* ---- Onboarding ---- */
export interface OnboardingAnswers {
  targetYear?: 2027 | 2028 | null;
  stage?: PrepStage;
  attempt?: string | null;
  focus?: { papers?: PrepPapers; subjects?: string[] };
  routine?: { dailyMin: number; weeklyMin: number; windows: StudyWindow[] };
  support?: string[];
}
/** GET|PUT /me/onboarding */
export interface OnboardingView {
  status: OnboardingStatus;
  step: number;
  answers: OnboardingAnswers;
}

/** PUT /me/onboarding body */
export interface OnboardingSaveBody {
  step: number;
  answers: OnboardingAnswers;
  status?: "in_progress" | "skipped";
}
/** POST /me/onboarding/plan-preview */
export interface PlanPreview {
  tasks: NewTask[];
}
/** POST /me/onboarding/complete */
export interface OnboardingCompleteResult {
  createdTasks: number;
}

/** PATCH /me response wrapper */
export interface MeResponse {
  user: UserView;
}

/* ---- Question bank (admin) ---- */
export type QuestionFormat = "single" | "statements";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionSourceType = "platform" | "pyq" | "ai_generated";
export type VerificationStatus = "unverified" | "verified" | "platform_sample";
export type QuestionStatus = "draft" | "published" | "retired";

export interface QuestionOption {
  key: OptionKey;
  text: string;
}

export interface QuestionAdminView {
  id: string;
  format: QuestionFormat;
  stem: string;
  statements: string[] | null;
  options: QuestionOption[];
  correctOption: OptionKey;
  explanation: string;
  optionReasoning: Record<OptionKey, string>;
  misconception: { option: OptionKey; text: string } | null;
  difficulty: Difficulty;
  subjectNodeId: string;
  topic: string | null;
  gsPaper: string;
  sourceType: QuestionSourceType;
  pyqYear: number | null;
  pyqPaper: string | null;
  verificationStatus: VerificationStatus;
  status: QuestionStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export type NewQuestion = Omit<
  QuestionAdminView,
  "id" | "version" | "createdAt" | "updatedAt" | "status" | "verificationStatus"
> &
  Partial<Pick<QuestionAdminView, "status" | "verificationStatus">>;

export interface QuestionImportResult {
  created: number;
  errors: { index: number; message: string }[];
}

/* ---- Practice ---- */
export type PracticeSource = "platform" | "pyq" | "mixed";
export type PracticeMode = "learning" | "test";
export type Confidence = "guess" | "fairly" | "sure";
export type PracticeStatus = "in_progress" | "submitted" | "expired";

export interface PracticeSubject {
  id: string;
  title: string;
  gsPaper: string;
  publishedCount: number;
  pyqVerifiedCount: number;
}

export interface PracticeAvailability {
  requested: number;
  available: number;
}

export interface CreatePracticeSession {
  subjectNodeIds: string[];
  source: PracticeSource;
  count: number;
  mode: PracticeMode;
  timed: boolean;
}

/** Revealed per question only per the leakage rules (never in test mode before submit). */
export interface QuestionFeedback {
  correctOption: OptionKey;
  correct: boolean;
  explanation: string;
}

export interface PracticeSessionHeader {
  id: string;
  mode: PracticeMode;
  timed: boolean;
  status: PracticeStatus;
  endsAt: string | null;
  remainingSeconds: number | null;
  total: number;
}

export interface PracticeQuestionView {
  ordinal: number;
  questionId: string;
  format: QuestionFormat;
  stem: string;
  statements: string[] | null;
  options: QuestionOption[];
  selected: OptionKey | null;
  flagged: boolean;
  confidence: Confidence | null;
  feedback?: QuestionFeedback;
}

/** POST /practice/sessions -> 201 */
export interface CreatedPracticeSession {
  session: PracticeSessionHeader;
  requested: number;
  got: number;
}

/** GET /practice/sessions/:id */
export interface PracticeSessionDetail {
  session: PracticeSessionHeader;
  questions: PracticeQuestionView[];
}

/** PUT /practice/sessions/:id/answers/:ordinal body */
export interface AnswerPayload {
  selected?: OptionKey | null;
  flagged?: boolean;
  confidence?: Confidence | null;
  timeMsDelta?: number;
}
export interface AnswerResult {
  saved: true;
  feedback?: QuestionFeedback;
}

export interface TopicBreakdown {
  subjectNodeId: string;
  title: string;
  correct: number;
  total: number;
}

export interface PracticeResults {
  session: {
    mode: PracticeMode;
    status: PracticeStatus;
    submittedAt: string;
    timeTakenSeconds: number;
    total: number;
  };
  /** null in learning mode */
  score: number | null;
  accuracy: number;
  correct: number;
  incorrect: number;
  skipped: number;
  byTopic: TopicBreakdown[];
  questions: {
    ordinal: number;
    questionId: string;
    selected: OptionKey | null;
    correctOption: OptionKey;
    correct: boolean | null;
    flagged: boolean;
    bookmarked: boolean;
  }[];
  nextAction: {
    kind: "review_mistakes" | "practise_weak_topic" | "see_progress";
    label: string;
    subjectNodeId?: string;
  };
}

/** GET /practice/sessions/:id/questions/:ordinal/review */
export interface QuestionReview {
  question: {
    stem: string;
    statements: string[] | null;
    options: QuestionOption[];
    format: QuestionFormat;
    difficulty: Difficulty;
    topic: string | null;
    isSample: boolean;
  };
  yourAnswer: OptionKey | null;
  correctOption: OptionKey;
  correct: boolean | null;
  confidence: Confidence | null;
  timeMs: number;
  explanation: string;
  optionReasoning: Record<OptionKey, string>;
  misconception: { option: OptionKey; text: string } | null;
  othersAnswered: { sample: number; pctByOption: Record<OptionKey, number> | null };
  bookmarked: boolean;
  reasoningText: string | null;
}

/** GET /practice/mistakes and /practice/bookmarks items */
export interface CollectionItem {
  questionId: string;
  stem: string;
  subjectTitle: string;
  reason: string;
  timesWrong: number;
  lastSeen: string;
}

export interface AttemptSummary {
  id: string;
  kind: "practice" | "retry";
  mode: PracticeMode;
  submittedAt: string;
  total: number;
  correct: number;
  accuracy: number;
  /** null in learning mode */
  score: number | null;
  title: string;
}
export interface AttemptsPage {
  attempts: AttemptSummary[];
  nextCursor: string | null;
}

export type ReportType = "wrong_key" | "typo" | "ambiguous" | "other";
export interface QuestionReportInput {
  type: ReportType;
  text?: string;
}
