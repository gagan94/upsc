import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { syllabusNodes } from './catalog';
import { users } from './identity';

export const planner = pgSchema('planner');

export const ACTIVITY_TYPES = [
  'reading',
  'revision',
  'practice_mcq',
  'answer_writing',
  'current_affairs',
  'notes',
  'mock_test',
  'mentor_session',
  'other',
] as const;
export const PRIORITIES = ['low', 'normal', 'high'] as const;
export const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'skipped'] as const;
export const TASK_SOURCES = ['manual', 'starter_plan', 'system', 'seed'] as const;

export interface TaskLink {
  type: 'practice_set' | 'lesson' | 'note';
  id?: string;
  href?: string;
}

export const tasks = planner.table(
  'tasks',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    subjectNodeId: uuid('subject_node_id').references(() => syllabusNodes.id),
    activityType: text('activity_type', { enum: ACTIVITY_TYPES }).notNull().default('other'),
    durationMin: integer('duration_min'),
    scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
    priority: text('priority', { enum: PRIORITIES }).notNull().default('normal'),
    status: text('status', { enum: TASK_STATUSES }).notNull().default('todo'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    actualMin: integer('actual_min'),
    source: text('source', { enum: TASK_SOURCES }).notNull().default('manual'),
    linked: jsonb('linked').$type<TaskLink>(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('tasks_user_scheduled_idx').on(t.userId, t.scheduledStart),
    index('tasks_user_status_idx').on(t.userId, t.status),
    index('tasks_user_backlog_idx')
      .on(t.userId)
      .where(sql`scheduled_start is null and deleted_at is null`),
  ],
);
