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

/** Upserts every sample question by its deterministic id; a changed stem updates the row in place. */
export async function seedQuestions(db: Db, _ctx: SeedContext): Promise<void> {
  const seen = new Set<string>();
  for (const q of loadQuestions()) {
    const r = validateImportRow(questionRow(q, syllabusId(q.subject)), seen);
    if ('error' in r) throw new Error(`questions.json: ${q.slug}: ${r.error}`);
    const values = {
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
      updatedAt: new Date(),
    };
    const id = questionId(q.slug);
    await db.insert(questions).values({ id, ...values }).onConflictDoUpdate({ target: questions.id, set: values });
    await db
      .insert(questionVersions)
      .values({ questionId: id, version: 1, correctOption: r.correctOption, reason: 'seed' })
      .onConflictDoUpdate({ target: [questionVersions.questionId, questionVersions.version], set: { correctOption: r.correctOption } });
  }
}
