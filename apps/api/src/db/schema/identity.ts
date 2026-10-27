import { sql } from 'drizzle-orm';
import { pgSchema, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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
});
