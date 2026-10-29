import { sql } from 'drizzle-orm';
import { date, index, integer, jsonb, pgSchema, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
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

export const STUDY_SESSION_STATUSES = ['running', 'paused', 'ended', 'discarded'] as const;
export const STUDY_SESSION_END_REASONS = ['user', 'target_reached', 'recovered', 'discarded'] as const;

export const studySessions = planner.table(
  'study_sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    taskId: uuid('task_id').references(() => tasks.id),
    subjectNodeId: uuid('subject_node_id').references(() => syllabusNodes.id),
    plannedMin: integer('planned_min').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    activeSeconds: integer('active_seconds').notNull().default(0),
    pausedSeconds: integer('paused_seconds').notNull().default(0),
    idleSeconds: integer('idle_seconds').notNull().default(0),
    status: text('status', { enum: STUDY_SESSION_STATUSES }).notNull().default('running'),
    endReason: text('end_reason', { enum: STUDY_SESSION_END_REASONS }),
    focusRating: integer('focus_rating'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // At most one running-or-paused session per user; enforced by the database, not by a prior SELECT.
    uniqueIndex('study_sessions_one_active_idx')
      .on(t.userId)
      .where(sql`status in ('running', 'paused')`),
    index('study_sessions_user_started_idx').on(t.userId, t.startedAt),
  ],
);

export interface SubjectTarget {
  subjectNodeId: string;
  weeklyMin: number;
}

export const goals = planner.table('goals', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  dailyMin: integer('daily_min').notNull(),
  weeklyMin: integer('weekly_min').notNull(),
  monthlyMilestone: text('monthly_milestone'),
  milestoneDate: date('milestone_date', { mode: 'string' }),
  subjectTargets: jsonb('subject_targets').$type<SubjectTarget[]>().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const EXAM_KINDS = ['prelims', 'mains'] as const;
export const EXAM_DATE_STATUSES = ['illustrative', 'confirmed'] as const;

export const examDates = planner.table('exam_dates', {
  id: uuid('id').primaryKey(),
  exam: text('exam', { enum: EXAM_KINDS }).notNull(),
  year: integer('year').notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  status: text('status', { enum: EXAM_DATE_STATUSES }).notNull().default('illustrative'),
});
