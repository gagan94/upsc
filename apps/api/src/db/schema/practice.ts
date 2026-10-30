import { boolean, char, index, integer, jsonb, numeric, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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

export const SESSION_KINDS = ['practice', 'retry'] as const;
export const SESSION_MODES = ['learning', 'test'] as const;
export const SESSION_STATUSES = ['in_progress', 'submitted', 'expired'] as const;
export const PRACTICE_SOURCES = ['platform', 'pyq', 'mixed'] as const;
export const CONFIDENCE_LEVELS = ['guess', 'fairly', 'sure'] as const;

export interface SessionConfig {
  subjectNodeIds: string[];
  source: (typeof PRACTICE_SOURCES)[number];
  count: number;
}
export interface Marking {
  correct: number;
  incorrect: number;
}
export interface SessionSummary {
  byTopic: { subjectNodeId: string; title: string; correct: number; total: number }[];
}

export const sessions = practice.table(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    kind: text('kind', { enum: SESSION_KINDS }).notNull().default('practice'),
    mode: text('mode', { enum: SESSION_MODES }).notNull(),
    timed: boolean('timed').notNull(),
    config: jsonb('config').$type<SessionConfig>().notNull(),
    marking: jsonb('marking').$type<Marking>().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    status: text('status', { enum: SESSION_STATUSES }).notNull().default('in_progress'),
    score: numeric('score'),
    accuracy: numeric('accuracy'),
    correctCount: integer('correct_count'),
    incorrectCount: integer('incorrect_count'),
    skippedCount: integer('skipped_count'),
    summary: jsonb('summary').$type<SessionSummary>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_created_idx').on(t.userId, t.createdAt)],
);

export const sessionQuestions = practice.table(
  'session_questions',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id),
    ordinal: integer('ordinal').notNull(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id),
    questionVersion: integer('question_version').notNull(),
    selected: char('selected', { length: 1 }).$type<OptionKey>(),
    flagged: boolean('flagged').notNull().default(false),
    confidence: text('confidence', { enum: CONFIDENCE_LEVELS }),
    timeMs: integer('time_ms').notNull().default(0),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
    reasoningText: text('reasoning_text'),
    correct: boolean('correct'),
    marks: numeric('marks'),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.ordinal] }), index('session_questions_question_idx').on(t.questionId)],
);
