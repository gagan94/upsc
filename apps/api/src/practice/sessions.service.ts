import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, or, sql, SQL } from 'drizzle-orm';
import { AppError } from '../common/errors';
import { DB, Db } from '../db/db.module';
import { newId } from '../db/ids';
import { mistakeEntries, questions, questionVersions, sessionQuestions, sessions, syllabusNodes } from '../db/schema';
import type { OptionKey, QuestionOption, SessionConfig, SessionSummary } from '../db/schema/practice';
import { CONFIDENCE_LEVELS } from '../db/schema/practice';
import { bookmarkedQuestionIds } from './bookmarks-seam';
import { DEFAULT_MARKING, scoreAnswers, SECONDS_PER_QUESTION } from './scoring';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Conn = Db | Tx;
type SessionRow = typeof sessions.$inferSelect;
type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export interface CreateInput extends SessionConfig {
  mode: SessionRow['mode'];
  timed: boolean;
}
export interface AnswerInput {
  selected?: OptionKey | null;
  flagged?: boolean;
  confidence?: Confidence | null;
  timeMsDelta?: number;
}
export interface Feedback {
  correctOption: OptionKey;
  correct: boolean | null;
  explanation: string;
}
/** The only question fields a student sees while a session is open. Built field by field, never from a spread row. */
export interface SessionQuestionView {
  ordinal: number;
  questionId: string;
  format: 'single' | 'statements';
  stem: string;
  statements: string[] | null;
  options: { key: OptionKey; text: string }[];
  selected: OptionKey | null;
  flagged: boolean;
  confidence: Confidence | null;
  feedback?: Feedback;
}
export interface SessionView {
  session: {
    id: string;
    mode: SessionRow['mode'];
    timed: boolean;
    status: SessionRow['status'];
    endsAt: string | null;
    remainingSeconds: number | null;
    total: number;
  };
  questions: SessionQuestionView[];
}
export type NextAction =
  | { kind: 'practise_weak_topic'; label: string; subjectNodeId: string }
  | { kind: 'review_mistakes' | 'see_progress'; label: string };
export interface ResultsView {
  session: { id: string; mode: SessionRow['mode']; status: SessionRow['status']; submittedAt: string; timeTakenSeconds: number; total: number };
  score: number | null;
  accuracy: number;
  correct: number;
  incorrect: number;
  skipped: number;
  byTopic: SessionSummary['byTopic'];
  questions: { ordinal: number; questionId: string; selected: OptionKey | null; correctOption: OptionKey; correct: boolean | null; flagged: boolean; bookmarked: boolean }[];
  nextAction: NextAction;
}

export const WEAK_ACCURACY = 0.6;
/** Upper bound for a question's accumulated time (24 h), well inside int4. */
export const TIME_MS_CAP = 86_400_000;

const notFound = () => new AppError(404, 'not_found', 'Practice session not found');

// All time arithmetic uses the database clock (now()); the client clock is never trusted.
const overdueSql = sql<boolean>`(${sessions.endsAt} is not null and ${sessions.endsAt} <= now())`;
const remainingSql = sql<number | null>`case when ${sessions.endsAt} is null then null
  else greatest(0, floor(extract(epoch from (${sessions.endsAt} - now()))))::int end`;
const timeTakenSql = sql<number | null>`case when ${sessions.submittedAt} is null then null
  else greatest(0, round(extract(epoch from (least(${sessions.submittedAt}, coalesce(${sessions.endsAt}, ${sessions.submittedAt})) - ${sessions.startedAt}))))::int end`;
/** The answer key at the version frozen into the session (falls back to the live key only if history is missing). */
const frozenKeySql = sql<OptionKey>`coalesce(${questionVersions.correctOption}, ${questions.correctOption})`;

const sessionFields = { s: sessions, overdue: overdueSql, remaining: remainingSql, timeTaken: timeTakenSql };

function sourceFilter(source: SessionConfig['source']): SQL | undefined {
  const platform = eq(questions.sourceType, 'platform');
  const pyq = and(eq(questions.sourceType, 'pyq'), eq(questions.verificationStatus, 'verified'));
  return source === 'platform' ? platform : source === 'pyq' ? pyq : or(platform, pyq);
}

const eligible = (cfg: Pick<SessionConfig, 'subjectNodeIds' | 'source'>) =>
  and(eq(questions.status, 'published'), inArray(questions.subjectNodeId, cfg.subjectNodeIds), sourceFilter(cfg.source));

const num = (v: string | null): number | null => (v === null ? null : Number(v));

export function nextActionFor(accuracy: number, incorrect: number, byTopic: SessionSummary['byTopic']): NextAction {
  if (accuracy < WEAK_ACCURACY && byTopic.length) {
    let weakest = byTopic[0];
    for (const t of byTopic) if (t.correct / t.total < weakest.correct / weakest.total) weakest = t;
    return { kind: 'practise_weak_topic', label: `Practise ${weakest.title}`, subjectNodeId: weakest.subjectNodeId };
  }
  if (incorrect > 0) return { kind: 'review_mistakes', label: 'Review your mistakes' };
  return { kind: 'see_progress', label: 'See your progress' };
}

@Injectable()
export class SessionsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Practice subjects are syllabus nodes with at least one published question (exact match on subject_node_id). */
  async subjects(): Promise<{ id: string; title: string; gsPaper: string; publishedCount: number; pyqVerifiedCount: number }[]> {
    const rows = await this.db
      .select({
        id: syllabusNodes.id,
        title: syllabusNodes.title,
        gsPaper: syllabusNodes.paper,
        publishedCount: sql<number>`count(*)::int`,
        pyqVerifiedCount: sql<number>`(count(*) filter (where ${questions.sourceType} = 'pyq' and ${questions.verificationStatus} = 'verified'))::int`,
      })
      .from(questions)
      .innerJoin(syllabusNodes, eq(syllabusNodes.id, questions.subjectNodeId))
      .where(eq(questions.status, 'published'))
      .groupBy(syllabusNodes.id)
      .orderBy(asc(syllabusNodes.path), asc(syllabusNodes.order), asc(syllabusNodes.title), asc(syllabusNodes.id));
    return rows.map((r) => ({ ...r, publishedCount: Number(r.publishedCount), pyqVerifiedCount: Number(r.pyqVerifiedCount) }));
  }

  async availability(_userId: string, cfg: SessionConfig): Promise<{ requested: number; available: number }> {
    const [{ n }] = await this.db.select({ n: sql<number>`count(*)::int` }).from(questions).where(eligible(cfg));
    return { requested: cfg.count, available: Math.min(cfg.count, Number(n)) };
  }

  async create(userId: string, cfg: CreateInput): Promise<SessionView & { requested: number; got: number }> {
    const id = newId();
    const got = await this.db.transaction(async (tx) => {
      const picked = await tx
        .select({ id: questions.id, version: questions.version })
        .from(questions)
        .where(eligible(cfg))
        .orderBy(sql`random()`)
        .limit(cfg.count);
      if (!picked.length) throw new AppError(409, 'no_questions', 'No published questions match this selection');
      // One transaction, so started_at and ends_at come from the same now().
      await tx.insert(sessions).values({
        id,
        userId,
        kind: 'practice',
        mode: cfg.mode,
        timed: cfg.timed,
        config: { subjectNodeIds: cfg.subjectNodeIds, source: cfg.source, count: cfg.count },
        marking: DEFAULT_MARKING,
        startedAt: sql`now()`,
        endsAt: cfg.timed ? sql`now() + make_interval(secs => ${picked.length * SECONDS_PER_QUESTION})` : null,
        status: 'in_progress',
      });
      await tx.insert(sessionQuestions).values(
        picked.map((p, i) => ({ sessionId: id, ordinal: i + 1, questionId: p.id, questionVersion: p.version })),
      );
      return picked.length;
    });
    return { ...(await this.get(userId, id)), requested: cfg.count, got };
  }

  async get(userId: string, id: string): Promise<SessionView> {
    const row = await this.closeIfOverdue(userId, id);
    const qs = await this.questionRows(this.db, id);
    const open = row.s.status === 'in_progress';
    return {
      session: {
        id: row.s.id,
        mode: row.s.mode,
        timed: row.s.timed,
        status: row.s.status,
        endsAt: row.s.endsAt?.toISOString() ?? null,
        remainingSeconds: row.s.endsAt === null ? null : open ? Number(row.remaining) : 0,
        total: qs.length,
      },
      questions: qs.map((q) => {
        const view: SessionQuestionView = {
          ordinal: q.ordinal,
          questionId: q.questionId,
          format: q.format,
          stem: q.stem,
          statements: q.statements ?? null,
          options: (q.options as QuestionOption[]).map((o) => ({ key: o.key, text: o.text })),
          selected: q.selected,
          flagged: q.flagged,
          confidence: q.confidence,
        };
        // Leakage rule: keys only after submit, or in learning mode for a question already answered.
        if (!open || (row.s.mode === 'learning' && q.selected !== null)) view.feedback = feedbackOf(q);
        return view;
      }),
    };
  }

  async answer(userId: string, id: string, ordinal: number, input: AnswerInput): Promise<{ saved: true; feedback?: Feedback }> {
    const out = await this.db.transaction(async (tx) => {
      const row = await this.lock(tx, userId, id);
      if (row.s.status === 'submitted') throw new AppError(409, 'session_submitted', 'This session has already been submitted');
      if (row.s.status === 'expired') return { expired: true as const };
      if (row.overdue) {
        await this.finalize(tx, row.s, 'expired');
        return { expired: true as const };
      }
      const [sq] = await tx
        .select()
        .from(sessionQuestions)
        .where(and(eq(sessionQuestions.sessionId, id), eq(sessionQuestions.ordinal, ordinal)));
      if (!sq) throw new AppError(404, 'not_found', 'Question not found in this session');
      const learning = row.s.mode === 'learning';
      if (learning && input.selected !== undefined && sq.selected !== null && input.selected !== sq.selected) {
        throw new AppError(409, 'already_answered', 'This question has already been answered');
      }
      const set: Partial<Record<keyof typeof sessionQuestions.$inferInsert, unknown>> = {};
      if (input.selected !== undefined && input.selected !== sq.selected) {
        set.selected = input.selected;
        set.answeredAt = input.selected === null ? null : sql`now()`;
      }
      if (input.flagged !== undefined) set.flagged = input.flagged;
      if (input.confidence !== undefined) set.confidence = input.confidence;
      if (input.timeMsDelta) {
        set.timeMs = sql`least(${sessionQuestions.timeMs}::bigint + ${input.timeMsDelta}, ${TIME_MS_CAP})::int`;
      }
      if (Object.keys(set).length) {
        await tx
          .update(sessionQuestions)
          .set(set as typeof sessionQuestions.$inferInsert)
          .where(and(eq(sessionQuestions.sessionId, id), eq(sessionQuestions.ordinal, ordinal)));
      }
      const selected = input.selected !== undefined ? input.selected : sq.selected;
      if (!learning || selected === null) return { expired: false as const };
      const [q] = (await this.questionRows(tx, id)).filter((r) => r.ordinal === ordinal);
      return { expired: false as const, feedback: feedbackOf({ ...q, selected }) };
    });
    // Thrown after the transaction commits, so the auto-submit is kept.
    if (out.expired) throw new AppError(409, 'session_expired', 'Time is up: this session has been submitted');
    return out.feedback ? { saved: true, feedback: out.feedback } : { saved: true };
  }

  async submit(userId: string, id: string): Promise<ResultsView> {
    await this.db.transaction(async (tx) => {
      const row = await this.lock(tx, userId, id);
      if (row.s.status === 'in_progress') await this.finalize(tx, row.s, row.overdue ? 'expired' : 'submitted');
    });
    return this.buildResults(userId, id);
  }

  async results(userId: string, id: string): Promise<ResultsView> {
    const row = await this.closeIfOverdue(userId, id);
    if (row.s.status === 'in_progress') throw new AppError(409, 'not_submitted', 'This session has not been submitted yet');
    return this.buildResults(userId, id);
  }

  /** Load the caller's session; an in-progress one past `ends_at` is auto-submitted (once) first. */
  async closeIfOverdue(userId: string, id: string) {
    const row = await this.load(this.db, userId, id);
    if (row.s.status !== 'in_progress' || !row.overdue) return row;
    await this.db.transaction(async (tx) => {
      const locked = await this.lock(tx, userId, id);
      if (locked.s.status === 'in_progress' && locked.overdue) await this.finalize(tx, locked.s, 'expired');
    });
    return this.load(this.db, userId, id);
  }

  private async load(conn: Conn, userId: string, id: string) {
    const [row] = await conn.select(sessionFields).from(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
    if (!row) throw notFound();
    return row;
  }

  /** `SELECT … FOR UPDATE` on the caller's session row: writes and submits serialise on it. */
  private async lock(tx: Tx, userId: string, id: string) {
    const [row] = await tx
      .select(sessionFields)
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
      .for('update');
    if (!row) throw notFound();
    return row;
  }

  private questionRows(conn: Conn, sessionId: string) {
    return conn
      .select({
        ordinal: sessionQuestions.ordinal,
        questionId: sessionQuestions.questionId,
        selected: sessionQuestions.selected,
        flagged: sessionQuestions.flagged,
        confidence: sessionQuestions.confidence,
        correct: sessionQuestions.correct,
        format: questions.format,
        stem: questions.stem,
        statements: questions.statements,
        options: questions.options,
        explanation: questions.explanation,
        subjectNodeId: questions.subjectNodeId,
        subjectTitle: syllabusNodes.title,
        key: frozenKeySql,
      })
      .from(sessionQuestions)
      .innerJoin(questions, eq(questions.id, sessionQuestions.questionId))
      .innerJoin(syllabusNodes, eq(syllabusNodes.id, questions.subjectNodeId))
      .leftJoin(
        questionVersions,
        and(eq(questionVersions.questionId, sessionQuestions.questionId), eq(questionVersions.version, sessionQuestions.questionVersion)),
      )
      .where(eq(sessionQuestions.sessionId, sessionId))
      .orderBy(asc(sessionQuestions.ordinal));
  }

  /** Score and close a locked, in-progress session. Called only under the row lock, so it runs once. */
  private async finalize(tx: Tx, s: SessionRow, status: 'submitted' | 'expired'): Promise<void> {
    const qs = await this.questionRows(tx, s.id);
    const scored = scoreAnswers(qs.map((q) => ({ selected: q.selected, correctOption: q.key })), s.marking, s.mode);
    for (const [i, q] of qs.entries()) {
      const p = scored.perQuestion[i];
      await tx
        .update(sessionQuestions)
        .set({ correct: p.correct, marks: String(p.marks) })
        .where(and(eq(sessionQuestions.sessionId, s.id), eq(sessionQuestions.ordinal, q.ordinal)));
    }
    await this.recordMistakes(tx, s.userId, qs, scored.perQuestion);
    const topics = new Map<string, SessionSummary['byTopic'][number]>();
    for (const [i, q] of qs.entries()) {
      const t = topics.get(q.subjectNodeId) ?? { subjectNodeId: q.subjectNodeId, title: q.subjectTitle, correct: 0, total: 0 };
      t.total += 1;
      if (scored.perQuestion[i].correct) t.correct += 1;
      topics.set(q.subjectNodeId, t);
    }
    const byTopic = [...topics.values()].sort((a, b) => a.title.localeCompare(b.title) || a.subjectNodeId.localeCompare(b.subjectNodeId));
    await tx
      .update(sessions)
      .set({
        status,
        submittedAt: sql`now()`,
        score: scored.score === null ? null : String(scored.score),
        accuracy: String(scored.accuracy),
        correctCount: scored.correct,
        incorrectCount: scored.incorrect,
        skippedCount: scored.skipped,
        summary: { byTopic },
      })
      .where(eq(sessions.id, s.id));
  }

  /** Mistake notebook updates; runs inside finalize (same lock), so each session contributes exactly once. */
  private async recordMistakes(
    tx: Tx,
    userId: string,
    qs: { questionId: string; selected: OptionKey | null; confidence: Confidence | null }[],
    per: { correct: boolean | null }[],
  ): Promise<void> {
    for (const [i, q] of qs.entries()) {
      const correct = per[i].correct;
      if (q.selected === null || correct === null) continue;
      const key = { userId, questionId: q.questionId };
      if (!correct) {
        await tx
          .insert(mistakeEntries)
          .values({ ...key, reason: 'incorrect', timesWrong: 1 })
          .onConflictDoUpdate({
            target: [mistakeEntries.userId, mistakeEntries.questionId],
            set: { reason: 'incorrect', timesWrong: sql`${mistakeEntries.timesWrong} + 1`, lastSeen: sql`now()`, resolvedAt: null },
          });
      } else if (q.confidence === 'guess') {
        await tx.insert(mistakeEntries).values({ ...key, reason: 'guessed', timesWrong: 1 }).onConflictDoNothing();
      } else {
        await tx
          .update(mistakeEntries)
          .set({ resolvedAt: sql`now()` })
          .where(and(eq(mistakeEntries.userId, userId), eq(mistakeEntries.questionId, q.questionId), isNull(mistakeEntries.resolvedAt)));
      }
    }
  }

  /** Results are read back from stored rows only, so every call returns the identical payload. */
  private async buildResults(userId: string, id: string): Promise<ResultsView> {
    const { s, timeTaken } = await this.load(this.db, userId, id);
    const qs = await this.questionRows(this.db, id);
    const bookmarked = await bookmarkedQuestionIds(this.db, userId, qs.map((q) => q.questionId));
    const byTopic = s.summary?.byTopic ?? [];
    const accuracy = num(s.accuracy) ?? 0;
    const incorrect = s.incorrectCount ?? 0;
    return {
      session: {
        id: s.id,
        mode: s.mode,
        status: s.status,
        submittedAt: (s.submittedAt as Date).toISOString(),
        timeTakenSeconds: Number(timeTaken ?? 0),
        total: qs.length,
      },
      score: num(s.score),
      accuracy,
      correct: s.correctCount ?? 0,
      incorrect,
      skipped: s.skippedCount ?? 0,
      byTopic,
      questions: qs.map((q) => ({
        ordinal: q.ordinal,
        questionId: q.questionId,
        selected: q.selected,
        correctOption: q.key,
        correct: q.correct,
        flagged: q.flagged,
        bookmarked: bookmarked.has(q.questionId),
      })),
      nextAction: nextActionFor(accuracy, incorrect, byTopic),
    };
  }
}

function feedbackOf(q: { selected: OptionKey | null; key: OptionKey; explanation: string }): Feedback {
  return { correctOption: q.key, correct: q.selected === null ? null : q.selected === q.key, explanation: q.explanation };
}
