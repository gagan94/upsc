import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Db } from '../db/db.module';
import { questions, questionVersions } from '../db/schema';
import { DIFFICULTIES, OPTION_KEYS, QUESTION_FORMATS, type OptionKey } from '../db/schema/practice';
import { validateImportRow } from '../practice/import';
import { seedId } from './ids';
import { syllabusId } from './seed-catalog';
import type { SeedContext } from './run-seed';

/** One question as written in seed-data/questions.json (options are the four option texts in A-D order). */
export interface QuestionSeed {
  slug: string;
  /** Slug of the syllabus node (a level-3 prelims node, or prelims-csat). */
  subject: string;
  topic: string;
  format: (typeof QUESTION_FORMATS)[number];
  difficulty: (typeof DIFFICULTIES)[number];
  stem: string;
  statements?: string[];
  options: [string, string, string, string];
  correctOption: OptionKey;
  explanation: string;
  optionReasoning: Record<OptionKey, string>;
  misconception: { option: OptionKey; text: string };
}

export const loadQuestions = (): QuestionSeed[] =>
  JSON.parse(readFileSync(join(__dirname, '../../seed-data/questions.json'), 'utf8')) as QuestionSeed[];

export const questionId = (slug: string): string => seedId(`question:${slug}`);

/** The importer-shaped row for a seed question (shared by the seeder and its tests). */
export function questionRow(q: QuestionSeed, subjectNodeId: string): Record<string, unknown> {
  return {
    format: q.format,
    stem: q.stem,
    ...(q.format === 'statements' ? { statements: q.statements } : {}),
    options: OPTION_KEYS.map((key, i) => ({ key, text: q.options[i] })),
    correctOption: q.correctOption,
    explanation: q.explanation,
    optionReasoning: q.optionReasoning,
    misconception: q.misconception,
    difficulty: q.difficulty,
    subjectNodeId,
    topic: q.topic,
    gsPaper: q.subject === 'prelims-csat' ? 'CSAT Paper II' : 'GS Paper I',
    sourceType: 'platform',
  };
}

/**
 * Upserts every sample question by its deterministic id; a changed stem updates the row in place.
 * Every row is validated before anything is written, then all rows are written in one transaction.
 * Meant for fresh/demo environments: re-running overwrites admin edits to these rows.
 */
export async function seedQuestions(db: Db, _ctx: SeedContext, rows: QuestionSeed[] = loadQuestions()): Promise<void> {
  const seen = new Set<string>();
  const prepared = rows.map((q) => {
    const r = validateImportRow(questionRow(q, syllabusId(q.subject)), seen);
    if ('error' in r) throw new Error(`questions.json: ${q.slug}: ${r.error}`);
    return { slug: q.slug, r };
  });
  const now = new Date();
  const values = prepared.map(({ slug, r }) => ({
    id: questionId(slug),
    format: r.format,
    stem: r.stem,
    statements: r.statements ?? null,
    options: r.options,
    correctOption: r.correctOption,
    explanation: r.explanation ?? '',
    optionReasoning: r.optionReasoning ?? {},
    misconception: r.misconception ?? null,
    difficulty: r.difficulty,
    subjectNodeId: r.subjectNodeId,
    topic: r.topic ?? null,
    gsPaper: r.gsPaper,
    sourceType: 'platform' as const,
    pyqYear: null,
    pyqPaper: null,
    verificationStatus: 'platform_sample' as const,
    status: 'published' as const,
    updatedAt: now,
  }));
  if (!values.length) return;
  await db.transaction(async (tx) => {
    await tx
      .insert(questions)
      .values(values)
      .onConflictDoUpdate({
        target: questions.id,
        set: {
          format: sql`excluded.format`,
          stem: sql`excluded.stem`,
          statements: sql`excluded.statements`,
          options: sql`excluded.options`,
          correctOption: sql`excluded.correct_option`,
          explanation: sql`excluded.explanation`,
          optionReasoning: sql`excluded.option_reasoning`,
          misconception: sql`excluded.misconception`,
          difficulty: sql`excluded.difficulty`,
          subjectNodeId: sql`excluded.subject_node_id`,
          topic: sql`excluded.topic`,
          gsPaper: sql`excluded.gs_paper`,
          sourceType: sql`excluded.source_type`,
          pyqYear: sql`excluded.pyq_year`,
          pyqPaper: sql`excluded.pyq_paper`,
          verificationStatus: sql`excluded.verification_status`,
          status: sql`excluded.status`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
    await tx
      .insert(questionVersions)
      .values(values.map((v) => ({ questionId: v.id, version: 1, correctOption: v.correctOption, reason: 'seed' })))
      .onConflictDoUpdate({
        target: [questionVersions.questionId, questionVersions.version],
        set: { correctOption: sql`excluded.correct_option` },
      });
  });
}
