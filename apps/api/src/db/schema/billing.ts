import { boolean, integer, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './identity';

export const billing = pgSchema('billing');

export const featureCatalog = billing.table('feature_catalog', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['boolean', 'limit'] }).notNull(),
  defaultPeriod: text('default_period', { enum: ['day', 'week', 'month', 'lifetime', 'none'] })
    .notNull()
    .default('none'),
});

export const plans = billing.table('plans', {
  id: uuid('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  status: text('status').notNull().default('active'),
});

export const planEntitlements = billing.table(
  'plan_entitlements',
  {
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),
    featureKey: text('feature_key')
      .notNull()
      .references(() => featureCatalog.key),
    enabled: boolean('enabled').notNull(),
    limitValue: integer('limit_value'),
    period: text('period', { enum: ['day', 'week', 'month', 'lifetime', 'none'] }).notNull().default('none'),
  },
  (t) => [primaryKey({ columns: [t.planId, t.featureKey] })],
);

export const subscriptions = billing.table('subscriptions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id),
  status: text('status').notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
});

export const entitlementOverrides = billing.table('entitlement_overrides', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  featureKey: text('feature_key')
    .notNull()
    .references(() => featureCatalog.key),
  enabled: boolean('enabled').notNull(),
  limitValue: integer('limit_value'),
  period: text('period', { enum: ['day', 'week', 'month', 'lifetime', 'none'] }).notNull().default('none'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  reason: text('reason').notNull(),
});

export const usageCounters = billing.table(
  'usage_counters',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    featureKey: text('feature_key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.featureKey, t.windowStart] })],
);
