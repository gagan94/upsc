import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { afterCursor, Cursor, cursorTs, encodeCursor } from '../common/cursor';
import { AppError } from '../common/errors';
import { DB, Db } from '../db/db.module';
import { newId } from '../db/ids';
import { questions, questionVersions, syllabusNodes } from '../db/schema';
import { OPTION_KEYS } from '../db/schema/practice';
import { NewQuestion, newQuestionSchema, normalizeStem } from './import';
import { parse } from '../common/validation';
import { z } from 'zod';

type Row = typeof questions.$inferSelect;

export interface QuestionAdminView {
  id: string;
  format: Row['format'];
  stem: string;
  statements: string[] | null;
  options: Row['options'];
  correctOption: Row['correctOption'];
  explanation: string;
  optionReasoning: Row['optionReasoning'];
  misconception: Row['misconception'];
  difficulty: Row['difficulty'];
  subjectNodeId: string;
  topic: string | null;
  gsPaper: string;
  sourceType: Row['sourceType'];
  pyqYear: number | null;
  pyqPaper: string | null;
  verificationStatus: Row['verificationStatus'];
  status: Row['status'];
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QuestionPatch = Partial<NewQuestion> & { reason?: string };

export interface ListQuery {
  status?: Row['status'] | 'all';
  subjectNodeId?: string;
  sourceType?: Row['sourceType'];
  q?: string;
  cursor?: Cursor | null;
  limit: number;
}

/** SQL twin of `normalizeStem`. */
export const normalizedStemSql = sql<string>`lower(regexp_replace(btrim(${questions.stem}), ${sql.raw(String.raw`'\s+'`)}, ' ', 'g'))`;

const notFound = () => new AppError(404, 'not_found', 'Question not found');
const toView = (r: Row): QuestionAdminView => ({
  id: r.id,
  format: r.format,
  stem: r.stem,
  statements: r.statements,
  options: r.options,
  correctOption: r.correctOption,
  explanation: r.explanation,
  optionReasoning: r.optionReasoning,
  misconception: r.misconception,
  difficulty: r.difficulty,
  subjectNodeId: r.subjectNodeId,
  topic: r.topic,
  gsPaper: r.gsPaper,
  sourceType: r.sourceType,
  pyqYear: r.pyqYear,
  pyqPaper: r.pyqPaper,
  verificationStatus: r.verificationStatus,
  status: r.status,
  version: r.version,
  createdBy: r.createdBy,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export function toInsert(input: NewQuestion, editorId: string | null, now = new Date()): typeof questions.$inferInsert {
  return {
    id: newId(),
    format: input.format,
    stem: input.stem,
    statements: input.format === 'statements' ? (input.statements ?? null) : null,
    options: input.options,
    correctOption: input.correctOption,
    explanation: input.explanation ?? '',
    optionReasoning: input.optionReasoning ?? {},
    misconception: input.misconception ?? null,
    difficulty: input.difficulty,
    subjectNodeId: input.subjectNodeId,
    topic: input.topic ?? null,
    gsPaper: input.gsPaper,
    sourceType: input.sourceType ?? 'platform',
    pyqYear: input.pyqYear ?? null,
    pyqPaper: input.pyqPaper ?? null,
    verificationStatus: 'unverified',
    status: 'draft',
    version: 1,
    createdBy: editorId,
    createdAt: now,
    updatedAt: now,
  };
}

@Injectable()
export class QuestionsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(editorId: string, input: NewQuestion): Promise<QuestionAdminView> {
    await this.assertSubjects([input.subjectNodeId]);
    await this.assertStemFree(input.stem);
    const values = toInsert(input, editorId);
    const row = await this.db.transaction(async (tx) => {
      const [r] = await tx.insert(questions).values(values).returning();
      await tx.insert(questionVersions).values({
        questionId: r.id, version: 1, correctOption: r.correctOption, changedBy: editorId, reason: 'created',
      });
      return r;
    });
    return toView(row);
  }

  async get(id: string): Promise<QuestionAdminView> {
    return toView(await this.load(id));
  }

  async update(id: string, editorId: string, patch: QuestionPatch): Promise<QuestionAdminView> {
    const current = await this.load(id);
    const { reason, ...fields } = patch;
    // Merge onto the stored question and validate the whole, so cross-field rules hold after the edit.
    const merged = parse(newQuestionSchema, {
      format: current.format,
      stem: current.stem,
      statements: current.statements,
      options: current.options,
      correctOption: current.correctOption,
      explanation: current.explanation,
      optionReasoning: current.optionReasoning,
      misconception: current.misconception,
      difficulty: current.difficulty,
      subjectNodeId: current.subjectNodeId,
      topic: current.topic,
      gsPaper: current.gsPaper,
      sourceType: current.sourceType,
      pyqYear: current.pyqYear,
      pyqPaper: current.pyqPaper,
      ...fields,
    });
    if (fields.subjectNodeId && fields.subjectNodeId !== current.subjectNodeId) await this.assertSubjects([fields.subjectNodeId]);
    if (fields.stem !== undefined && normalizeStem(fields.stem) !== normalizeStem(current.stem)) {
      await this.assertStemFree(fields.stem, id);
    }
    const keyChanged = merged.correctOption !== current.correctOption;
    const version = keyChanged ? current.version + 1 : current.version;
    const row = await this.db.transaction(async (tx) => {
      const [r] = await tx
        .update(questions)
        .set({
          format: merged.format,
          stem: merged.stem,
          statements: merged.format === 'statements' ? (merged.statements ?? null) : null,
          options: merged.options,
          correctOption: merged.correctOption,
          explanation: merged.explanation ?? '',
          optionReasoning: merged.optionReasoning ?? {},
          misconception: merged.misconception ?? null,
          difficulty: merged.difficulty,
          subjectNodeId: merged.subjectNodeId,
          topic: merged.topic ?? null,
          gsPaper: merged.gsPaper,
          sourceType: merged.sourceType ?? 'platform',
          pyqYear: merged.pyqYear ?? null,
          pyqPaper: merged.pyqPaper ?? null,
          version,
          updatedAt: new Date(),
        })
        .where(eq(questions.id, id))
        .returning();
      if (keyChanged) {
        await tx.insert(questionVersions).values({
          questionId: id, version, correctOption: merged.correctOption, changedBy: editorId, reason: reason ?? null,
        });
      }
      return r;
    });
    return toView(row);
  }

  async list(q: ListQuery): Promise<{ questions: QuestionAdminView[]; nextCursor: string | null }> {
    const status = q.status ?? 'published';
    const escaped = q.q?.replace(/[\\%_]/g, (c) => `\\${c}`);
    const rows = await this.db
      .select({ row: questions, cursorTs: cursorTs(questions.createdAt) })
      .from(questions)
      .where(
        and(
          status === 'all' ? undefined : eq(questions.status, status),
          q.subjectNodeId ? eq(questions.subjectNodeId, q.subjectNodeId) : undefined,
          q.sourceType ? eq(questions.sourceType, q.sourceType) : undefined,
          escaped ? sql`${questions.stem} ilike ${`%${escaped}%`}` : undefined,
          afterCursor(questions.createdAt, questions.id, q.cursor ?? null),
        ),
      )
      .orderBy(asc(questions.createdAt), asc(questions.id))
      .limit(q.limit + 1);
    const page = rows.slice(0, q.limit);
    const last = page[page.length - 1];
    return {
      questions: page.map((p) => toView(p.row)),
      nextCursor: rows.length > q.limit && last ? encodeCursor(last.cursorTs, last.row.id) : null,
    };
  }

  async publish(id: string): Promise<QuestionAdminView> {
    const r = await this.load(id);
    const missing: string[] = [];
    if (!r.explanation.trim()) missing.push('explanation');
    for (const k of OPTION_KEYS) if (!r.optionReasoning[k]?.trim()) missing.push(`optionReasoning.${k}`);
    if (missing.length) {
      throw new AppError(400, 'incomplete_question', `Cannot publish: missing ${missing.join(', ')}`, { missing });
    }
    return this.setStatus(id, 'published');
  }

  retire(id: string): Promise<QuestionAdminView> {
    return this.setStatus(id, 'retired');
  }

  async verify(id: string, input: { pyqYear?: number; pyqPaper?: string }): Promise<QuestionAdminView> {
    const r = await this.load(id);
    const pyqYear = input.pyqYear ?? r.pyqYear;
    const pyqPaper = input.pyqPaper ?? r.pyqPaper;
    if (r.sourceType === 'pyq' && (pyqYear == null || !pyqPaper)) {
      throw new AppError(400, 'pyq_details_required', 'A previous-year question needs its year and paper before it can be verified');
    }
    const [row] = await this.db
      .update(questions)
      .set({ verificationStatus: 'verified', pyqYear, pyqPaper, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();
    return toView(row);
  }

  /** Normalised stems among `stems` that already exist in the bank. */
  async existingStems(stems: string[]): Promise<Set<string>> {
    if (!stems.length) return new Set();
    const rows = await this.db
      .select({ s: normalizedStemSql })
      .from(questions)
      .where(inArray(normalizedStemSql, stems));
    return new Set(rows.map((r) => r.s));
  }

  async assertSubjects(ids: string[]): Promise<void> {
    const unique = [...new Set(ids)];
    const found = await this.db.select({ id: syllabusNodes.id }).from(syllabusNodes).where(inArray(syllabusNodes.id, unique));
    if (found.length !== unique.length) {
      throw new AppError(400, 'validation_failed', 'subjectNodeId: unknown syllabus node');
    }
  }

  async knownSubjects(ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const found = await this.db.select({ id: syllabusNodes.id }).from(syllabusNodes).where(inArray(syllabusNodes.id, ids));
    return new Set(found.map((f) => f.id));
  }

  /** Insert already-validated rows as drafts with their version-1 history, atomically. */
  async insertDrafts(editorId: string, inputs: NewQuestion[]): Promise<number> {
    if (!inputs.length) return 0;
    const now = new Date();
    const values = inputs.map((i) => toInsert(i, editorId, now));
    await this.db.transaction(async (tx) => {
      await tx.insert(questions).values(values);
      await tx.insert(questionVersions).values(
        values.map((v) => ({ questionId: v.id as string, version: 1, correctOption: v.correctOption, changedBy: editorId, reason: 'created' })),
      );
    });
    return values.length;
  }

  private async assertStemFree(stem: string, exceptId?: string): Promise<void> {
    const [hit] = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(normalizedStemSql, normalizeStem(stem)), exceptId ? ne(questions.id, exceptId) : undefined))
      .limit(1);
    if (hit) throw new AppError(409, 'duplicate_stem', 'A question with this stem already exists');
  }

  private async setStatus(id: string, status: Row['status']): Promise<QuestionAdminView> {
    const [row] = await this.db
      .update(questions)
      .set({ status, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();
    if (!row) throw notFound();
    return toView(row);
  }

  private async load(id: string): Promise<Row> {
    const [row] = await this.db.select().from(questions).where(eq(questions.id, id));
    if (!row) throw notFound();
    return row;
  }
}

export const verifySchema = z.object({
  pyqYear: z.number().int().min(1950).max(2100).optional(),
  pyqPaper: z.string().trim().min(1).max(100).optional(),
});
