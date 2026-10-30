import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/db.module';
import {
  bookmarks,
  examDates,
  goals,
  mistakeEntries,
  preparationProfiles,
  questions,
  sessionQuestions,
  sessions,
  studyPreferences,
  studySessions,
  syllabusNodes,
  tasks,
  users,
} from '../db/schema';
import type { OptionKey, SessionSummary } from '../db/schema/practice';
import { DEFAULT_MARKING, SECONDS_PER_QUESTION, scoreAnswers } from '../practice/scoring';
import { seedId } from './ids';
import { syllabusId } from './seed-catalog';
import { loadQuestions, questionId } from './seed-questions';
import type { SeedContext } from './run-seed';

export const STUDENT_EMAIL = 'student@example.com';

const IST_OFFSET_MIN = 330;

/** Wall-clock `hh:mm` IST on the IST calendar day that is `dayOffset` days from `now`'s IST day. */
function istAt(now: Date, dayOffset: number, hh: number, mm = 0): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + dayOffset, hh, mm) - IST_OFFSET_MIN * 60_000);
}
const istDate = (now: Date, dayOffset: number): string => istAt(now, dayOffset, 12).toISOString().slice(0, 10);

export const taskId = (n: number): string => seedId(`planner-task:${n}`);
export const studySessionId = (n: number): string => seedId(`planner-study-session:${n}`);
export const practiceSessionId = (n: number): string => seedId(`practice-session:${n}`);
export const examDateId = (exam: string, year: number): string => seedId(`exam-date:${exam}:${year}`);

const TASK_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];
const STUDY_NUMBERS = [1, 2, 3, 4, 5];

/** Illustrative placeholders only (the UI labels them "Illustrative"); not the official schedule. */
const EXAM_DATES = [
  { exam: 'prelims', year: 2027, date: '2027-05-23' },
  { exam: 'mains', year: 2027, date: '2027-09-17' },
] as const;

type Outcome = 'right' | 'wrong' | 'guess' | 'skip';
interface PracticePlan {
  n: number;
  mode: 'test' | 'learning';
  subjects: string[];
  count: number;
  daysAgo: number;
  /** Per ordinal: right, wrong (the most tempting wrong option), guess (right, marked "guess") or skip. */
  pattern: Outcome[];
}
const PRACTICE: PracticePlan[] = [
  {
    n: 1,
    mode: 'test',
    subjects: ['prelims-polity', 'prelims-economy'],
    count: 10,
    daysAgo: 1,
    pattern: ['right', 'right', 'wrong', 'right', 'skip', 'wrong', 'right', 'right', 'wrong', 'right'],
  },
  { n: 2, mode: 'learning', subjects: ['prelims-polity'], count: 5, daysAgo: 3, pattern: ['right', 'wrong', 'right', 'guess', 'wrong'] },
  { n: 3, mode: 'learning', subjects: ['prelims-history'], count: 5, daysAgo: 4, pattern: ['right', 'right', 'wrong', 'right', 'right'] },
];

interface MistakeRow {
  questionId: string;
  reason: 'incorrect' | 'guessed';
  timesWrong: number;
  firstSeen: Date;
  lastSeen: Date;
  resolvedAt: Date | null;
}

/**
 * Mirrors `recordMistakes` in practice/sessions.service.ts (kept in sync by a test that recomputes the
 * table from the seeded answers): wrong -> upsert, times_wrong + 1, reopen; correct with confidence
 * 'guess' -> a 'guessed' entry only if none exists; any other correct answer resolves an open entry.
 */
function applyMistakeRules(
  entries: Map<string, MistakeRow>,
  qid: string,
  correct: boolean,
  confidence: string | null,
  at: Date,
): void {
  const existing = entries.get(qid);
  if (!correct) {
    if (existing) Object.assign(existing, { reason: 'incorrect', timesWrong: existing.timesWrong + 1, lastSeen: at, resolvedAt: null });
    else entries.set(qid, { questionId: qid, reason: 'incorrect', timesWrong: 1, firstSeen: at, lastSeen: at, resolvedAt: null });
  } else if (confidence === 'guess') {
    if (!existing) entries.set(qid, { questionId: qid, reason: 'guessed', timesWrong: 1, firstSeen: at, lastSeen: at, resolvedAt: null });
  } else if (existing && existing.resolvedAt === null) {
    existing.resolvedAt = at;
  }
}

/**
 * Demo planner/practice data for student@example.com. Deletes and recreates only the rows it owns.
 * Meant for fresh/demo environments: re-running overwrites the demo rows (and exam dates) it owns.
 */
export async function seedPlanner(db: Db, ctx: SeedContext): Promise<void> {
  const [student] = await db.select({ id: users.id }).from(users).where(eq(users.email, STUDENT_EMAIL));
  if (!student) throw new Error(`seed-planner: ${STUDENT_EMAIL} does not exist; run seed-identity first`);
  const userId = student.id;
  const now = ctx.now ?? new Date();

  const nodes = await db.select({ id: syllabusNodes.id, title: syllabusNodes.title }).from(syllabusNodes);
  const titleOf = new Map(nodes.map((n) => [n.id, n.title]));
  const seedQs = loadQuestions();
  const pool = (slug: string) => seedQs.filter((q) => q.subject === slug);

  // Each practice session draws its questions from the seeded bank, interleaved across its subjects.
  const built = PRACTICE.map((p) => {
    const lists = p.subjects.map(pool);
    const picked: typeof seedQs = [];
    for (let i = 0; picked.length < p.count; i += 1) {
      for (const l of lists) if (picked.length < p.count && l[i]) picked.push(l[i]);
    }
    return { p, picked };
  });
  const sessionQuestionIds = [...new Set(built.flatMap((b) => b.picked.map((q) => questionId(q.slug))))];
  const bookmarkIds = [pool('prelims-polity')[3], pool('prelims-economy')[2], pool('prelims-geography')[5]].map((q) => questionId(q.slug));
  const needed = [...new Set([...sessionQuestionIds, ...bookmarkIds])];
  const present = await db.select({ id: questions.id }).from(questions).where(inArray(questions.id, needed));
  if (present.length !== needed.length) throw new Error('seed-planner: the sample questions are missing; seed questions first');

  await db.transaction(async (tx) => {
    const profile = {
      targetYear: 2027,
      stage: 'preparing',
      attempt: 'first',
      focus: { papers: 'both', subjects: ['indian-polity', 'history', 'economy'] },
      medium: 'en',
      onboardingStatus: 'completed',
      onboardingStep: 5,
      updatedAt: now,
    };
    await tx.insert(preparationProfiles).values({ userId, ...profile }).onConflictDoUpdate({ target: preparationProfiles.userId, set: profile });
    const prefs = {
      dailyGoalMin: 240,
      weeklyGoalMin: 1680,
      windows: ['morning', 'evening'],
      weekStart: 'monday',
      defaultSessionMin: 25,
      remindersEnabled: false,
      updatedAt: now,
    };
    await tx.insert(studyPreferences).values({ userId, ...prefs }).onConflictDoUpdate({ target: studyPreferences.userId, set: prefs });
    const goal = {
      dailyMin: 240,
      weeklyMin: 1680,
      monthlyMilestone: 'Finish Polity foundations',
      milestoneDate: istDate(now, 21),
      subjectTargets: [{ subjectNodeId: syllabusId('prelims-polity'), weeklyMin: 420 }],
      updatedAt: now,
    };
    await tx.insert(goals).values({ userId, ...goal }).onConflictDoUpdate({ target: goals.userId, set: goal });

    for (const e of EXAM_DATES) {
      const v = { exam: e.exam, year: e.year, date: e.date, status: 'illustrative' as const };
      await tx.insert(examDates).values({ id: examDateId(e.exam, e.year), ...v }).onConflictDoUpdate({ target: examDates.id, set: v });
    }

    // Remove what an earlier run created (children before parents).
    const practiceIds = PRACTICE.map((p) => practiceSessionId(p.n));
    await tx.delete(studySessions).where(and(eq(studySessions.userId, userId), inArray(studySessions.id, STUDY_NUMBERS.map(studySessionId))));
    // Sessions the student created against a seeded task keep their history but lose the link (FK is NO ACTION).
    const seededTasks = tx.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.source, 'seed')));
    await tx.update(studySessions).set({ taskId: null }).where(and(eq(studySessions.userId, userId), inArray(studySessions.taskId, seededTasks)));
    await tx.delete(tasks).where(and(eq(tasks.userId, userId), eq(tasks.source, 'seed')));
    await tx.delete(sessionQuestions).where(inArray(sessionQuestions.sessionId, practiceIds));
    await tx.delete(sessions).where(and(eq(sessions.userId, userId), inArray(sessions.id, practiceIds)));
    await tx.delete(mistakeEntries).where(and(eq(mistakeEntries.userId, userId), inArray(mistakeEntries.questionId, sessionQuestionIds)));
    await tx.delete(bookmarks).where(and(eq(bookmarks.userId, userId), inArray(bookmarks.questionId, bookmarkIds)));

    // Eight tasks: 2 completed today, 1 overdue, 3 upcoming, 2 unscheduled.
    const polity = syllabusId('prelims-polity');
    const economy = syllabusId('prelims-economy');
    const task = (n: number, v: Omit<typeof tasks.$inferInsert, 'id' | 'userId' | 'source'>) => ({
      id: taskId(n),
      userId,
      source: 'seed' as const,
      ...v,
    });
    // Completed tasks sit on today's IST slots, or on yesterday's when the seed runs before they happen.
    const base = istAt(now, 0, 7, 52) <= now ? 0 : -1;
    const done = (at: Date) => ({ status: 'completed' as const, completedAt: at > now ? now : at });
    await tx.insert(tasks).values([
      task(1, { title: 'Read: Preamble and basic structure', subjectNodeId: polity, activityType: 'reading', durationMin: 45, actualMin: 45, priority: 'high', scheduledStart: istAt(now, base, 6, 30), ...done(istAt(now, base, 7, 15)) }),
      task(2, { title: 'Practise 10 Polity MCQs', subjectNodeId: polity, activityType: 'practice_mcq', durationMin: 20, actualMin: 22, scheduledStart: istAt(now, base, 7, 30), ...done(istAt(now, base, 7, 52)) }),
      task(3, { title: 'Revise Fundamental Rights notes', subjectNodeId: polity, activityType: 'revision', durationMin: 30, priority: 'high', scheduledStart: istAt(now, -1, 18, 0), status: 'todo' }),
      task(4, { title: 'Read: Modern India timeline', subjectNodeId: syllabusId('prelims-history'), activityType: 'reading', durationMin: 40, scheduledStart: istAt(now, 1, 9, 0), status: 'todo' }),
      task(5, { title: 'Practise 10 Economy MCQs', subjectNodeId: economy, activityType: 'practice_mcq', durationMin: 20, scheduledStart: istAt(now, 1, 16, 0), status: 'todo' }),
      task(6, { title: 'Write a 150-word note on federalism', subjectNodeId: polity, activityType: 'answer_writing', durationMin: 30, priority: 'low', scheduledStart: istAt(now, 2, 10, 0), status: 'todo' }),
      task(7, { title: 'Make notes: Monetary policy basics', subjectNodeId: economy, activityType: 'notes', durationMin: 30, status: 'todo' }),
      task(8, { title: 'Skim a weekly current-affairs digest', activityType: 'current_affairs', durationMin: 25, priority: 'low', status: 'todo' }),
    ]);

    // Five ended study sessions; yesterday, 2 and 3 days ago give a streak of 3.
    const study: { n: number; off: number; hour: number; min: number; subject: string; focus: number }[] = [
      { n: 1, off: -1, hour: 6, min: 50, subject: 'prelims-polity', focus: 4 },
      { n: 2, off: -1, hour: 19, min: 35, subject: 'prelims-economy', focus: 3 },
      { n: 3, off: -2, hour: 7, min: 45, subject: 'prelims-polity', focus: 5 },
      { n: 4, off: -3, hour: 18, min: 30, subject: 'prelims-history', focus: 4 },
      { n: 5, off: -5, hour: 7, min: 40, subject: 'prelims-geography', focus: 3 },
    ];
    await tx.insert(studySessions).values(
      study.map((s) => {
        const startedAt = istAt(now, s.off, s.hour);
        const endedAt = new Date(startedAt.getTime() + (s.min + 2) * 60_000);
        return {
          id: studySessionId(s.n),
          userId,
          taskId: null,
          subjectNodeId: syllabusId(s.subject),
          plannedMin: s.min,
          startedAt,
          lastHeartbeatAt: endedAt,
          endedAt,
          activeSeconds: s.min * 60,
          pausedSeconds: 120,
          idleSeconds: 0,
          status: 'ended' as const,
          endReason: 'user' as const,
          focusRating: s.focus,
        };
      }),
    );

    // Three submitted practice sessions with mixed correctness.
    // Oldest first, so the mistake notebook is built exactly as the engine would have built it over time.
    const mistakes = new Map<string, MistakeRow>();
    for (const { p, picked } of [...built].sort((a, b) => b.p.daysAgo - a.p.daysAgo)) {
      const startedAt = istAt(now, -p.daysAgo, 17);
      const answers = picked.map((q, i) => {
        const o = p.pattern[i];
        const selected: OptionKey | null = o === 'skip' ? null : o === 'wrong' ? q.misconception.option : q.correctOption;
        return { q, selected, confidence: o === 'guess' ? ('guess' as const) : o === 'right' ? ('sure' as const) : null };
      });
      const scored = scoreAnswers(answers.map((x) => ({ selected: x.selected, correctOption: x.q.correctOption })), DEFAULT_MARKING, p.mode);
      const byNode = new Map<string, SessionSummary['byTopic'][number]>();
      answers.forEach((x, i) => {
        const nodeId = syllabusId(x.q.subject);
        const t = byNode.get(nodeId) ?? { subjectNodeId: nodeId, title: titleOf.get(nodeId) ?? x.q.subject, correct: 0, total: 0 };
        t.total += 1;
        if (scored.perQuestion[i].correct) t.correct += 1;
        byNode.set(nodeId, t);
      });
      const submittedAt = new Date(startedAt.getTime() + picked.length * 55_000);
      const id = practiceSessionId(p.n);
      await tx.insert(sessions).values({
        id,
        userId,
        kind: 'practice',
        mode: p.mode,
        timed: p.mode === 'test',
        config: { subjectNodeIds: p.subjects.map(syllabusId), source: 'platform', count: p.count },
        marking: DEFAULT_MARKING,
        startedAt,
        endsAt: p.mode === 'test' ? new Date(startedAt.getTime() + picked.length * SECONDS_PER_QUESTION * 1000) : null,
        submittedAt,
        status: 'submitted',
        score: scored.score === null ? null : String(scored.score),
        accuracy: String(scored.accuracy),
        correctCount: scored.correct,
        incorrectCount: scored.incorrect,
        skippedCount: scored.skipped,
        summary: { byTopic: [...byNode.values()].sort((a, b) => a.title.localeCompare(b.title)) },
        createdAt: startedAt,
      });
      await tx.insert(sessionQuestions).values(
        answers.map((x, i) => ({
          sessionId: id,
          ordinal: i + 1,
          questionId: questionId(x.q.slug),
          questionVersion: 1,
          selected: x.selected,
          confidence: x.confidence,
          timeMs: 40_000 + i * 3_000,
          answeredAt: x.selected === null ? null : new Date(startedAt.getTime() + (i + 1) * 50_000),
          correct: scored.perQuestion[i].correct,
          marks: String(scored.perQuestion[i].marks),
        })),
      );
      for (const [i, x] of answers.entries()) {
        const correct = scored.perQuestion[i].correct;
        if (x.selected === null || correct === null) continue;
        applyMistakeRules(mistakes, questionId(x.q.slug), correct, x.confidence, submittedAt);
      }
    }
    if (mistakes.size) {
      await tx.insert(mistakeEntries).values([...mistakes.values()].map((m) => ({ userId, ...m })));
    }

    await tx.insert(bookmarks).values(bookmarkIds.map((qid) => ({ userId, questionId: qid, createdAt: istAt(now, -1, 20) })));
  });
}

/** Ids of the rows seed-planner owns (for the SeedReport). */
export function plannerIds(): { tasks: string[]; studySessions: string[]; practiceSessions: string[]; examDates: string[] } {
  return {
    tasks: TASK_NUMBERS.map(taskId),
    studySessions: STUDY_NUMBERS.map(studySessionId),
    practiceSessions: PRACTICE.map((p) => practiceSessionId(p.n)),
    examDates: EXAM_DATES.map((e) => examDateId(e.exam, e.year)),
  };
}
