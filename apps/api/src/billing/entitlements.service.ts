import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { AppError } from '../common/errors';
import { DB, Db } from '../db/db.module';
import { entitlementOverrides, planEntitlements, plans, subscriptions, users } from '../db/schema';
import { FEATURE_KEYS, FeatureKey } from './feature-keys';
import { Period, windowFor } from './windows';

export type CheckResult =
  | { allowed: true; remaining: number | null }
  | { allowed: false; reason: 'entitlement_required' | 'quota_exceeded'; resetsAt?: Date };

interface Effective {
  enabled: boolean;
  limitValue: number | null;
  period: Period;
}

const DEFAULT_TZ = 'Asia/Kolkata';

@Injectable()
export class EntitlementsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async check(userId: string, key: FeatureKey, cost = 1): Promise<CheckResult> {
    const ctx = await this.context(userId, key);
    if (!ctx.eff || !ctx.eff.enabled) return { allowed: false, reason: 'entitlement_required' };
    if (ctx.eff.limitValue === null) return { allowed: true, remaining: null };
    const w = windowFor(ctx.eff.period, ctx.tz);
    const used = await this.used(userId, key, w.start);
    const remaining = ctx.eff.limitValue - used;
    if (cost > remaining) {
      return { allowed: false, reason: 'quota_exceeded', resetsAt: w.resetsAt ?? undefined };
    }
    return { allowed: true, remaining };
  }

  /** Atomically consume `cost` units, or throw an AppError (402 / 429). */
  async consume(userId: string, key: FeatureKey, cost = 1): Promise<void> {
    const { eff, tz } = await this.context(userId, key);
    if (!eff || !eff.enabled) {
      throw new AppError(402, 'entitlement_required', `Your plan does not include ${key}`);
    }
    if (eff.limitValue === null) return;
    const w = windowFor(eff.period, tz);
    const limit = eff.limitValue;
    // One statement: insert on first use (only if cost fits), else increment only while
    // count + cost stays within the limit. Zero returned rows means quota exceeded.
    const res: unknown = await this.db.execute(sql`
      INSERT INTO "billing"."usage_counters" ("user_id", "feature_key", "window_start", "count")
      SELECT ${userId}::uuid, ${key}::text, ${w.start.toISOString()}::timestamptz, ${cost}::int
      WHERE ${cost}::int <= ${limit}::int
      ON CONFLICT ("user_id", "feature_key", "window_start") DO UPDATE
        SET "count" = "usage_counters"."count" + ${cost}::int
        WHERE "usage_counters"."count" + ${cost}::int <= ${limit}::int
      RETURNING "count"
    `);
    if (rowsOf(res).length === 0) {
      throw new AppError(429, 'quota_exceeded', `Quota exceeded for ${key}`, {
        resetsAt: w.resetsAt?.toISOString() ?? null,
      });
    }
  }

  async usage(
    userId: string,
  ): Promise<Array<{ key: FeatureKey; used: number; limit: number | null; resetsAt: Date | null }>> {
    const out: Array<{ key: FeatureKey; used: number; limit: number | null; resetsAt: Date | null }> = [];
    for (const key of FEATURE_KEYS) {
      const { eff, tz } = await this.context(userId, key);
      if (!eff || !eff.enabled) continue;
      if (eff.limitValue === null) {
        out.push({ key, used: 0, limit: null, resetsAt: null });
        continue;
      }
      const w = windowFor(eff.period, tz);
      out.push({ key, used: await this.used(userId, key, w.start), limit: eff.limitValue, resetsAt: w.resetsAt });
    }
    return out;
  }

  private async used(userId: string, key: string, windowStart: Date): Promise<number> {
    const res: unknown = await this.db.execute(sql`
      SELECT "count" FROM "billing"."usage_counters"
      WHERE "user_id" = ${userId}::uuid AND "feature_key" = ${key}::text
        AND "window_start" = ${windowStart.toISOString()}::timestamptz
    `);
    const row = rowsOf(res)[0];
    return row ? Number(row.count) : 0;
  }

  /** Override (unexpired) -> active subscription's plan -> default plan -> none. */
  private async context(userId: string, key: FeatureKey): Promise<{ eff: Effective | null; tz: string }> {
    const [user] = await this.db.select({ tz: users.timezone }).from(users).where(eq(users.id, userId));
    const tz = user?.tz ?? DEFAULT_TZ;
    const now = new Date();

    const [override] = await this.db
      .select()
      .from(entitlementOverrides)
      .where(
        and(
          eq(entitlementOverrides.userId, userId),
          eq(entitlementOverrides.featureKey, key),
          or(isNull(entitlementOverrides.expiresAt), gt(entitlementOverrides.expiresAt, now)),
        ),
      )
      .orderBy(desc(entitlementOverrides.id))
      .limit(1);
    if (override) return { eff: override, tz };

    const subRows = await this.db
      .select({ e: planEntitlements })
      .from(subscriptions)
      .innerJoin(planEntitlements, eq(planEntitlements.planId, subscriptions.planId))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active'),
          or(isNull(subscriptions.currentPeriodEnd), gt(subscriptions.currentPeriodEnd, now)),
          eq(planEntitlements.featureKey, key),
        ),
      )
      .orderBy(desc(subscriptions.id))
      .limit(1);
    if (subRows[0]) return { eff: subRows[0].e, tz };

    const defRows = await this.db
      .select({ e: planEntitlements })
      .from(plans)
      .innerJoin(planEntitlements, eq(planEntitlements.planId, plans.id))
      .where(and(eq(plans.isDefault, true), eq(plans.status, 'active'), eq(planEntitlements.featureKey, key)))
      .limit(1);
    return { eff: defRows[0]?.e ?? null, tz };
  }
}

function rowsOf(res: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(res)) return res as Array<Record<string, unknown>>;
  return ((res as { rows?: Array<Record<string, unknown>> }).rows ?? []) as Array<Record<string, unknown>>;
}
