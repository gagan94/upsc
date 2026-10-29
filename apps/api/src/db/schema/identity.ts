import { sql } from 'drizzle-orm';
import { boolean, integer, jsonb, pgSchema, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const identity = pgSchema('identity');

export const users = identity.table(
  'users',
  {
    id: uuid('id').primaryKey(),
    authProvider: text('auth_provider').notNull().default('supabase'),
    authSubject: text('auth_subject').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    roles: text('roles').array().notNull().default(sql`'{student}'::text[]`),
    timezone: text('timezone').notNull().default('Asia/Kolkata'),
    locale: text('locale').notNull().default('en'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (t) => [
    unique('users_auth_provider_subject_uq').on(t.authProvider, t.authSubject),
    uniqueIndex('users_email_lower_uq').on(sql`lower(${t.email})`),
  ],
);

export const profiles = identity.table('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  location: text('location'),
});

export const preparationProfiles = identity.table('preparation_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  targetYear: integer('target_year'),
  stage: text('stage'), // beginner | preparing | revision
  attempt: text('attempt'),
  focus: jsonb('focus').notNull().default({}),
  medium: text('medium').default('en'),
  onboardingStatus: text('onboarding_status').default('not_started'), // not_started | in_progress | completed | skipped
  onboardingStep: integer('onboarding_step').default(0),
  onboardingAnswers: jsonb('onboarding_answers').default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const studyPreferences = identity.table('study_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  dailyGoalMin: integer('daily_goal_min').default(240),
  weeklyGoalMin: integer('weekly_goal_min').default(1680),
  windows: jsonb('windows').default([]),
  weekStart: text('week_start').default('monday'), // monday | sunday
  defaultSessionMin: integer('default_session_min').default(25),
  remindersEnabled: boolean('reminders_enabled').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
