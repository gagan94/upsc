import { index, integer, jsonb, pgSchema, primaryKey, text, timestamp, uuid, char } from 'drizzle-orm/pg-core';
import { syllabusNodes } from './catalog';
import { users } from './identity';

export const practice = pgSchema('practice');

export const QUESTION_FORMATS = ['single', 'statements'] as const;
export const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const SOURCE_TYPES = ['platform', 'pyq', 'ai_generated'] as const;
export const VERIFICATION_STATUSES = ['unverified', 'verified', 'platform_sample'] as const;
export const QUESTION_STATUSES = ['draft', 'published', 'retired'] as const;

export type OptionKey = (typeof OPTION_KEYS)[number];
export interface QuestionOption {
  key: OptionKey;
  text: string;
}
export interface Misconception {
  option: OptionKey;
  text: string;
}

export const questions = practice.table(
  'questions',
  {
    id: uuid('id').primaryKey(),
    format: text('format', { enum: QUESTION_FORMATS }).notNull(),
    stem: text('stem').notNull(),
    statements: jsonb('statements').$type<string[]>(),
    options: jsonb('options').$type<QuestionOption[]>().notNull(),
    correctOption: char('correct_option', { length: 1 }).$type<OptionKey>().notNull(),
    explanation: text('explanation').notNull().default(''),
    optionReasoning: jsonb('option_reasoning').$type<Partial<Record<OptionKey, string>>>().notNull().default({}),
    misconception: jsonb('misconception').$type<Misconception>(),
    difficulty: text('difficulty', { enum: DIFFICULTIES }).notNull(),
    subjectNodeId: uuid('subject_node_id')
      .notNull()
      .references(() => syllabusNodes.id),
    topic: text('topic'),
    gsPaper: text('gs_paper').notNull(),
    sourceType: text('source_type', { enum: SOURCE_TYPES }).notNull().default('platform'),
    pyqYear: integer('pyq_year'),
    pyqPaper: text('pyq_paper'),
    verificationStatus: text('verification_status', { enum: VERIFICATION_STATUSES }).notNull().default('unverified'),
    status: text('status', { enum: QUESTION_STATUSES }).notNull().default('draft'),
    version: integer('version').notNull().default(1),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('questions_status_subject_idx').on(t.status, t.subjectNodeId),
    index('questions_status_source_verification_idx').on(t.status, t.sourceType, t.verificationStatus),
  ],
);

export const questionVersions = practice.table(
  'question_versions',
  {
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id),
    version: integer('version').notNull(),
    correctOption: char('correct_option', { length: 1 }).$type<OptionKey>().notNull(),
    changedBy: uuid('changed_by').references(() => users.id),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.version] })],
);
