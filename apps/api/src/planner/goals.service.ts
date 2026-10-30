import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { addDaysISO, dayRange, localDateOf, weekRange } from '../common/dates';
import { AppError } from '../common/errors';
import { DB, Db } from '../db/db.module';
import { examDates, goals, studySessions, syllabusNodes, tasks } from '../db/schema';
import type { SubjectTarget } from '../db/schema/planner';
import { PreparationService } from '../me/preparation.service';

export interface GoalsView {
  dailyMin: number;
  weeklyMin: number;
  monthlyMilestone: string | null;
  milestoneDate: string | null;
  subjectTargets: SubjectTarget[];
}

export type GoalsPatch = Partial<GoalsView>;

export interface ProgressView {
  weekStart: string;
  days: { date: string; recordedMin: number; plannedMin: number; tasksDone: number; tasksTotal: number }[];
  totals: { recordedMin: number; plannedMin: number; goalMin: number; tasksDone: number; tasksTotal: number };
  subjects: { subjectNodeId: string; title: string; plannedMin: number; recordedMin: number; targetMin: number | null }[];
}

export interface ExamDateView {
  id: string;
  exam: 'prelims' | 'mains';
  year: number;
  date: string;
  status: 'illustrative' | 'confirmed';
}

/** A day counts towards the streak with at least this many recorded minutes. */
export const STREAK_MIN_MINUTES = 10;
const STREAK_LOOKBACK_DAYS = 366;

const toMin = (seconds: number) => Math.floor(seconds / 60);

@Injectable()
export class GoalsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly prep: PreparationService,
  ) {}

  async getGoals(userId: string): Promise<GoalsView> {
    const [r] = await this.db.select().from(goals).where(eq(goals.userId, userId)).limit(1);
    if (!r) {
      const prefs = await this.prep.getPreferences(userId);
      return { dailyMin: prefs.dailyGoalMin, weeklyMin: prefs.weeklyGoalMin, monthlyMilestone: null, milestoneDate: null, subjectTargets: [] };
    }
    return {
      dailyMin: r.dailyMin,
      weeklyMin: r.weeklyMin,
      monthlyMilestone: r.monthlyMilestone,
      milestoneDate: r.milestoneDate,
      subjectTargets: (r.subjectTargets ?? []) as SubjectTarget[],
    };
  }

  /** Fields not in `patch` keep their current (or default) value; the result must be coherent. */
  async putGoals(userId: string, patch: GoalsPatch): Promise<GoalsView> {
    const next: GoalsView = { ...(await this.getGoals(userId)), ...patch };
    if (next.dailyMin > next.weeklyMin) throw new AppError(400, 'validation_failed', 'dailyMin must not exceed weeklyMin');
    const ids = next.subjectTargets.map((t) => t.subjectNodeId);
    if (ids.length) {
      const found = await this.db.select({ id: syllabusNodes.id }).from(syllabusNodes).where(inArray(syllabusNodes.id, ids));
      if (found.length !== new Set(ids).size) throw new AppError(400, 'validation_failed', 'subjectTargets: unknown syllabus node');
    }
    const values = { ...next, updatedAt: new Date() };
    await this.db
      .insert(goals)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: goals.userId, set: values });
    return next;
  }

  /** Progress for the week containing `anyDateInWeek` (default: today), in the user's time zone. */
  async progress(userId: string, tz: string, anyDateInWeek?: string): Promise<ProgressView> {
    const prefs = await this.prep.getPreferences(userId);
    const date = anyDateInWeek ?? localDateOf(new Date(), tz);
    const range = weekRange(date, tz, prefs.weekStart);
    const weekStart = localDateOf(range.start, tz);
    const dates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));

    const [g, taskRows, sessionRows] = await Promise.all([
      this.getGoals(userId),
      this.db
        .select({ scheduledStart: tasks.scheduledStart, durationMin: tasks.durationMin, status: tasks.status, subjectNodeId: tasks.subjectNodeId })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt), gte(tasks.scheduledStart, range.start), lt(tasks.scheduledStart, range.end))),
      // Recorded study = ended sessions only. Subject: the session's own, else its task's.
      this.db
        .select({
          startedAt: studySessions.startedAt,
          secs: studySessions.activeSeconds,
          subjectNodeId: sql<string | null>`coalesce(${studySessions.subjectNodeId}, ${tasks.subjectNodeId})`,
        })
        .from(studySessions)
        .leftJoin(tasks, and(eq(tasks.id, studySessions.taskId), eq(tasks.userId, userId)))
        .where(
          and(eq(studySessions.userId, userId), eq(studySessions.status, 'ended'), gte(studySessions.startedAt, range.start), lt(studySessions.startedAt, range.end)),
        ),
    ]);

    const day = new Map(dates.map((d) => [d, { secs: 0, plannedMin: 0, tasksDone: 0, tasksTotal: 0 }]));
    const subj = new Map<string, { plannedMin: number; secs: number }>();
    const subjOf = (id: string) => {
      let s = subj.get(id);
      if (!s) subj.set(id, (s = { plannedMin: 0, secs: 0 }));
      return s;
    };
    for (const t of taskRows) {
      const d = day.get(localDateOf(t.scheduledStart!, tz));
      if (!d) continue;
      d.tasksTotal += 1;
      if (t.status === 'completed') d.tasksDone += 1;
      if (t.status !== 'skipped') {
        d.plannedMin += t.durationMin ?? 0;
        if (t.subjectNodeId) subjOf(t.subjectNodeId).plannedMin += t.durationMin ?? 0;
      }
    }
    let totalSecs = 0;
    for (const s of sessionRows) {
      const d = day.get(localDateOf(s.startedAt, tz));
      if (!d) continue;
      d.secs += s.secs;
      totalSecs += s.secs;
      if (s.subjectNodeId) subjOf(s.subjectNodeId).secs += s.secs;
    }

    const targets = new Map(g.subjectTargets.map((t) => [t.subjectNodeId, t.weeklyMin]));
    for (const id of targets.keys()) subjOf(id);
    const titles = subj.size
      ? await this.db.select({ id: syllabusNodes.id, title: syllabusNodes.title }).from(syllabusNodes).where(inArray(syllabusNodes.id, [...subj.keys()]))
      : [];
    const titleOf = new Map(titles.map((t) => [t.id, t.title]));

    const days = dates.map((date) => {
      const d = day.get(date)!;
      return { date, recordedMin: toMin(d.secs), plannedMin: d.plannedMin, tasksDone: d.tasksDone, tasksTotal: d.tasksTotal };
    });
    return {
      weekStart,
      days,
      totals: {
        recordedMin: toMin(totalSecs),
        plannedMin: days.reduce((s, d) => s + d.plannedMin, 0),
        goalMin: g.weeklyMin,
        tasksDone: days.reduce((s, d) => s + d.tasksDone, 0),
        tasksTotal: days.reduce((s, d) => s + d.tasksTotal, 0),
      },
      subjects: [...subj.entries()]
        .map(([subjectNodeId, v]) => ({
          subjectNodeId,
          title: titleOf.get(subjectNodeId) ?? '',
          plannedMin: v.plannedMin,
          recordedMin: toMin(v.secs),
          targetMin: targets.get(subjectNodeId) ?? null,
        }))
        .sort((a, b) => a.title.localeCompare(b.title) || a.subjectNodeId.localeCompare(b.subjectNodeId)),
    };
  }

  /** Consecutive local days ending today (or yesterday if today has none) with >= STREAK_MIN_MINUTES recorded. */
  async streakDays(userId: string, tz: string): Promise<number> {
    const today = localDateOf(new Date(), tz);
    const from = dayRange(addDaysISO(today, -STREAK_LOOKBACK_DAYS), tz).start;
    const rows = await this.db
      .select({ startedAt: studySessions.startedAt, secs: studySessions.activeSeconds })
      .from(studySessions)
      .where(and(eq(studySessions.userId, userId), eq(studySessions.status, 'ended'), gte(studySessions.startedAt, from)));
    const perDay = new Map<string, number>();
    for (const r of rows) {
      const d = localDateOf(r.startedAt, tz);
      perDay.set(d, (perDay.get(d) ?? 0) + r.secs);
    }
    const qualifies = (d: string) => toMin(perDay.get(d) ?? 0) >= STREAK_MIN_MINUTES;
    let cursor = qualifies(today) ? today : addDaysISO(today, -1);
    let n = 0;
    while (qualifies(cursor)) {
      n += 1;
      cursor = addDaysISO(cursor, -1);
    }
    return n;
  }

  async listExamDates(): Promise<ExamDateView[]> {
    const rows = await this.db.select().from(examDates).orderBy(asc(examDates.date), asc(examDates.exam));
    return rows.map((r) => ({ id: r.id, exam: r.exam, year: r.year, date: r.date, status: r.status }));
  }
}
