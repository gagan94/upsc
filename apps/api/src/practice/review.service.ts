import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { Cursor, cursorTs, encodeCursor } from '../common/cursor';
import { AppError } from '../common/errors';
import { DB, Db } from '../db/db.module';
import { newId } from '../db/ids';
import {
  bookmarks,
  issueReports,
  mistakeEntries,
  questions,
  questionVersions,
  sessionQuestions,
  sessions,
  syllabusNodes,
} from '../db/schema';
import type { Misconception, OptionKey, QuestionOption } from '../db/schema/practice';
import { OPTION_KEYS, REPORT_TYPES } from '../db/schema/practice';
import { SECONDS_PER_QUESTION } from './scoring';
import { sessionTitle } from './session-title';
import { SessionsService, SessionView } from './sessions.service';

/** "How others answered" is shown only when at least this many users have a first answer to the question. */
export const OTHERS_MIN_SAMPLE = 100;
export const STEM_PREVIEW = 140;
export const REASONING_MAX = 1000;

const preview = (stem: string) => (stem.length <= STEM_PREVIEW ? stem : `${stem.slice(0, STEM_PREVIEW - 1)}…`);
const num = (v: string | null): number | null => (v === null ? null : Number(v));

export interface OthersAnswered {
  sample: number;
  pctByOption: Record<OptionKey, number> | null;
}

@Injectable()
export class ReviewService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly sessionsSvc: SessionsService,
  ) {}

  /** The caller's closed session (an overdue one is auto-submitted first); 404 if not theirs, 409 if still open. */
  private async closed(userId: string, id: string) {
    const row = await this.sessionsSvc.closeIfOverdue(userId, id);
    if (row.s.status === 'in_progress') throw new AppError(409, 'not_submitted', 'This session has not been submitted yet');
    return row.s;
  }

  /** A question the user has been shown in one of their own sessions. */
  private async assertSeen(userId: string, questionId: string): Promise<void> {
    const [row] = await this.db
      .select({ q: sessionQuestions.questionId })
      .from(sessionQuestions)
      .innerJoin(sessions, eq(sessions.id, sessionQuestions.sessionId))
      .where(and(eq(sessions.userId, userId), eq(sessionQuestions.questionId, questionId)))
      .limit(1);
    if (!row) throw new AppError(404, 'not_found', 'Question not found');
  }

  async review(userId: string, id: string, ordinal: number) {
    await this.closed(userId, id);
    const [r] = await this.db
      .select({
        questionId: sessionQuestions.questionId,
        selected: sessionQuestions.selected,
        confidence: sessionQuestions.confidence,
        timeMs: sessionQuestions.timeMs,
        correct: sessionQuestions.correct,
        reasoningText: sessionQuestions.reasoningText,
        format: questions.format,
        stem: questions.stem,
        statements: questions.statements,
        options: questions.options,
        difficulty: questions.difficulty,
        topic: questions.topic,
        verification: questions.verificationStatus,
        explanation: questions.explanation,
        optionReasoning: questions.optionReasoning,
        misconception: questions.misconception,
        subjectTitle: syllabusNodes.title,
        key: sql<OptionKey>`coalesce(${questionVersions.correctOption}, ${questions.correctOption})`,
      })
      .from(sessionQuestions)
      .innerJoin(questions, eq(questions.id, sessionQuestions.questionId))
      .innerJoin(syllabusNodes, eq(syllabusNodes.id, questions.subjectNodeId))
      .leftJoin(
        questionVersions,
        and(eq(questionVersions.questionId, sessionQuestions.questionId), eq(questionVersions.version, sessionQuestions.questionVersion)),
      )
      .where(and(eq(sessionQuestions.sessionId, id), eq(sessionQuestions.ordinal, ordinal)));
    if (!r) throw new AppError(404, 'not_found', 'Question not found in this session');
    const [marked, others] = await Promise.all([
      this.db
        .select({ q: bookmarks.questionId })
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.questionId, r.questionId))),
      this.othersAnswered(r.questionId),
    ]);
    return {
      question: {
        stem: r.stem,
        statements: r.statements ?? null,
        options: (r.options as QuestionOption[]).map((o) => ({ key: o.key, text: o.text })),
        format: r.format,
        difficulty: r.difficulty,
        topic: r.topic ?? r.subjectTitle,
        isSample: r.verification === 'platform_sample',
      },
      yourAnswer: r.selected,
      correctOption: r.key,
      correct: r.correct,
      confidence: r.confidence,
      timeMs: r.timeMs,
      explanation: r.explanation,
      optionReasoning: r.optionReasoning,
      misconception: (r.misconception as Misconception | null) ?? null,
      othersAnswered: others,
      bookmarked: marked.length > 0,
      reasoningText: r.reasoningText,
    };
  }

  /**
   * Aggregate counts only. Each user contributes their FIRST answered attempt (earliest submitted session),
   * from submitted/expired sessions, so retries never move the percentages.
   */
  private async othersAnswered(questionId: string): Promise<OthersAnswered> {
    const res: unknown = await this.db.execute(sql`
      select selected, count(*)::int as n from (
        select distinct on (s.user_id) sq.selected
        from practice.session_questions sq
        join practice.sessions s on s.id = sq.session_id
        where sq.question_id = ${questionId}::uuid and sq.selected is not null and s.status in ('submitted', 'expired')
        order by s.user_id, s.submitted_at asc, s.id asc
      ) first_answers group by selected`);
    const rows = (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as { selected: OptionKey; n: number }[];
    const counts: Record<OptionKey, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const r of rows) counts[r.selected] = Number(r.n);
    const sample = OPTION_KEYS.reduce((t, k) => t + counts[k], 0);
    if (sample < OTHERS_MIN_SAMPLE) return { sample, pctByOption: null };
    const pct = {} as Record<OptionKey, number>;
    for (const k of OPTION_KEYS) pct[k] = Math.round((counts[k] * 1000) / sample) / 10;
    return { sample, pctByOption: pct };
  }

  async setReasoning(userId: string, id: string, ordinal: number, text: string): Promise<{ saved: true }> {
    await this.closed(userId, id);
    const updated = await this.db
      .update(sessionQuestions)
      .set({ reasoningText: text === '' ? null : text })
      .where(and(eq(sessionQuestions.sessionId, id), eq(sessionQuestions.ordinal, ordinal)))
      .returning({ o: sessionQuestions.ordinal });
    if (!updated.length) throw new AppError(404, 'not_found', 'Question not found in this session');
    return { saved: true };
  }

  async retry(userId: string, id: string): Promise<SessionView> {
    const src = await this.closed(userId, id);
    const newSessionId = newId();
    await this.db.transaction(async (tx) => {
      const ordered = await tx
        .select({ questionId: sessionQuestions.questionId })
        .from(sessionQuestions)
        .where(eq(sessionQuestions.sessionId, id))
        .orderBy(asc(sessionQuestions.ordinal));
      const current = await tx
        .select({ id: questions.id, version: questions.version })
        .from(questions)
        .where(and(eq(questions.status, 'published'), inArray(questions.id, ordered.map((o) => o.questionId))));
      const byId = new Map(current.map((c) => [c.id, c.version]));
      const picked = ordered.filter((o) => byId.has(o.questionId));
      if (!picked.length) throw new AppError(409, 'no_questions', 'None of these questions are available any more');
      await tx.insert(sessions).values({
        id: newSessionId,
        userId,
        kind: 'retry',
        mode: src.mode,
        timed: src.timed,
        config: { ...src.config, count: picked.length },
        marking: src.marking,
        startedAt: sql`now()`,
        endsAt: src.timed ? sql`now() + make_interval(secs => ${picked.length * SECONDS_PER_QUESTION})` : null,
        status: 'in_progress',
      });
      await tx.insert(sessionQuestions).values(
        picked.map((p, i) => ({ sessionId: newSessionId, ordinal: i + 1, questionId: p.questionId, questionVersion: byId.get(p.questionId) as number })),
      );
    });
    return this.sessionsSvc.get(userId, newSessionId);
  }

  async mistakes(userId: string, opts: { subject?: string; includeResolved: boolean }) {
    const rows = await this.db
      .select({
        questionId: mistakeEntries.questionId,
        stem: questions.stem,
        subjectTitle: syllabusNodes.title,
        reason: mistakeEntries.reason,
        timesWrong: mistakeEntries.timesWrong,
        lastSeen: mistakeEntries.lastSeen,
      })
      .from(mistakeEntries)
      .innerJoin(questions, eq(questions.id, mistakeEntries.questionId))
      .innerJoin(syllabusNodes, eq(syllabusNodes.id, questions.subjectNodeId))
      .where(
        and(
          eq(mistakeEntries.userId, userId),
          opts.includeResolved ? undefined : isNull(mistakeEntries.resolvedAt),
          opts.subject ? eq(questions.subjectNodeId, opts.subject) : undefined,
        ),
      )
      .orderBy(desc(mistakeEntries.lastSeen), asc(mistakeEntries.questionId));
    return { items: rows.map((r) => ({ ...r, stem: preview(r.stem), lastSeen: r.lastSeen.toISOString() })) };
  }

  async bookmarkList(userId: string) {
    const rows = await this.db
      .select({ questionId: bookmarks.questionId, stem: questions.stem, subjectTitle: syllabusNodes.title, createdAt: bookmarks.createdAt })
      .from(bookmarks)
      .innerJoin(questions, eq(questions.id, bookmarks.questionId))
      .innerJoin(syllabusNodes, eq(syllabusNodes.id, questions.subjectNodeId))
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt), asc(bookmarks.questionId));
    return { items: rows.map((r) => ({ ...r, stem: preview(r.stem), createdAt: r.createdAt.toISOString() })) };
  }

  async addBookmark(userId: string, questionId: string): Promise<{ bookmarked: true }> {
    await this.assertSeen(userId, questionId);
    await this.db.insert(bookmarks).values({ userId, questionId }).onConflictDoNothing();
    return { bookmarked: true };
  }

  async removeBookmark(userId: string, questionId: string): Promise<{ bookmarked: false }> {
    await this.db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.questionId, questionId)));
    return { bookmarked: false };
  }

  async attempts(userId: string, limit: number, cursor: Cursor | null) {
    const ts = cursorTs(sessions.submittedAt);
    const rows = await this.db
      .select({ s: sessions, ts })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          inArray(sessions.status, ['submitted', 'expired']),
          cursor ? sql`(${sessions.submittedAt}, ${sessions.id}) < (${cursor.ts}::timestamptz, ${cursor.id}::uuid)` : undefined,
        ),
      )
      .orderBy(desc(sessions.submittedAt), desc(sessions.id))
      .limit(limit + 1);
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      attempts: page.map(({ s }) => ({
        id: s.id,
        kind: s.kind,
        mode: s.mode,
        submittedAt: (s.submittedAt as Date).toISOString(),
        total: (s.correctCount ?? 0) + (s.incorrectCount ?? 0) + (s.skippedCount ?? 0),
        correct: s.correctCount ?? 0,
        accuracy: num(s.accuracy) ?? 0,
        score: num(s.score),
        title: sessionTitle(s.summary),
      })),
      nextCursor: rows.length > limit && last ? encodeCursor(last.ts, last.s.id) : null,
    };
  }

  async report(userId: string, questionId: string, input: { type: (typeof REPORT_TYPES)[number]; text?: string }) {
    await this.assertSeen(userId, questionId);
    const id = newId();
    await this.db.insert(issueReports).values({ id, userId, questionId, type: input.type, text: input.text ?? null });
    return { id, status: 'open' as const };
  }

  async openReports(limit: number) {
    const rows = await this.db
      .select({
        id: issueReports.id,
        questionId: issueReports.questionId,
        userId: issueReports.userId,
        type: issueReports.type,
        text: issueReports.text,
        status: issueReports.status,
        createdAt: issueReports.createdAt,
        stem: questions.stem,
      })
      .from(issueReports)
      .innerJoin(questions, eq(questions.id, issueReports.questionId))
      .where(eq(issueReports.status, 'open'))
      .orderBy(desc(issueReports.createdAt), desc(issueReports.id))
      .limit(limit);
    return { reports: rows.map((r) => ({ ...r, stem: preview(r.stem), createdAt: r.createdAt.toISOString() })) };
  }
}
