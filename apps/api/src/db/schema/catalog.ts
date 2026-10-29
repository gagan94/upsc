import { AnyPgColumn, boolean, index, integer, jsonb, pgSchema, text, uuid } from 'drizzle-orm/pg-core';

export const catalog = pgSchema('catalog');

export const syllabusNodes = catalog.table('syllabus_nodes', {
  id: uuid('id').primaryKey(),
  parentId: uuid('parent_id').references((): AnyPgColumn => syllabusNodes.id),
  path: text('path').notNull(),
  level: integer('level').notNull(),
  examStage: text('exam_stage').notNull(),
  paper: text('paper').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  order: integer('order').notNull().default(0),
  status: text('status').notNull().default('draft'),
});

export const subjects = catalog.table(
  'subjects',
  {
    id: uuid('id').primaryKey(),
    syllabusNodeId: uuid('syllabus_node_id')
      .notNull()
      .references(() => syllabusNodes.id),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    gsPaper: text('gs_paper').notNull(),
    order: integer('order').notNull().default(0),
    entitlementKey: text('entitlement_key'),
    status: text('status').notNull().default('draft'),
  },
  (t) => [index('subjects_syllabus_node_idx').on(t.syllabusNodeId)],
);

export const modules = catalog.table(
  'modules',
  {
    id: uuid('id').primaryKey(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id),
    title: text('title').notNull(),
    order: integer('order').notNull().default(0),
    summary: text('summary').notNull().default(''),
    required: boolean('required').notNull().default(true),
    status: text('status').notNull().default('draft'),
  },
  (t) => [index('modules_subject_idx').on(t.subjectId)],
);

export const activities = catalog.table(
  'activities',
  {
    id: uuid('id').primaryKey(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => modules.id),
    type: text('type', {
      enum: ['lesson', 'quiz', 'assignment', 'pyq_set', 'revision', 'resource'],
    }).notNull(),
    title: text('title').notNull(),
    order: integer('order').notNull().default(0),
    required: boolean('required').notNull().default(true),
    estMinutes: integer('est_minutes'),
    status: text('status').notNull().default('draft'),
  },
  (t) => [index('activities_module_idx').on(t.moduleId)],
);

export const lessons = catalog.table('lessons', {
  activityId: uuid('activity_id')
    .primaryKey()
    .references(() => activities.id),
  summary: text('summary').notNull().default(''),
  bodyBlocks: jsonb('body_blocks').notNull().default([]),
  verificationStatus: text('verification_status').notNull().default('platform_sample'),
  locale: text('locale').notNull().default('en'),
});
