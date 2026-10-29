import type { Db } from '../db/db.module';
import { featureCatalog, planEntitlements, plans } from '../db/schema';
import { FEATURE_KEYS, type FeatureKey } from '../billing/feature-keys';
import type { SeedContext } from './run-seed';
import { seedId } from './ids';

type Period = 'day' | 'week' | 'month' | 'lifetime' | 'none';
type Spec = { name: string; limit?: { value: number; period: Period } };

// Keys without a limit are boolean features; keys with a limit are metered.
const FEATURES: Record<FeatureKey, Spec> = {
  'ai.ask.message': { name: 'AI ask: messages', limit: { value: 50, period: 'day' } },
  'ai.mcq.generate': { name: 'AI MCQ generation', limit: { value: 20, period: 'day' } },
  'ai.mains.evaluate': { name: 'AI mains answer evaluation', limit: { value: 5, period: 'week' } },
  'ai.plan.weekly': { name: 'AI weekly plan', limit: { value: 4, period: 'month' } },
  'practice.mock.full': { name: 'Full-length mock tests', limit: { value: 4, period: 'month' } },
  'practice.all_india': { name: 'All-India ranking tests' },
  'learn.content.premium': { name: 'Premium learning content' },
  'notes.offline': { name: 'Offline notes' },
  'progress.advanced': { name: 'Advanced progress analytics' },
  'forum.post': { name: 'Forum posting' },
  'messages.send': { name: 'Direct messages' },
  'planner.calendar_sync': { name: 'Planner calendar sync' },
  'revision.basic': { name: 'Basic revision' },
};

export const FREE_PLAN_KEY = 'free';
export const freePlanId = (): string => seedId(`plan:${FREE_PLAN_KEY}`);

export async function seedBilling(db: Db, _ctx: SeedContext): Promise<void> {
  for (const key of FEATURE_KEYS) {
    const f = FEATURES[key];
    const values = { name: f.name, type: f.limit ? ('limit' as const) : ('boolean' as const), defaultPeriod: f.limit?.period ?? 'none' };
    await db.insert(featureCatalog).values({ key, ...values }).onConflictDoUpdate({ target: featureCatalog.key, set: values });
  }
  const planId = freePlanId();
  const plan = { key: FREE_PLAN_KEY, name: 'Free', isDefault: true, status: 'active' };
  await db.insert(plans).values({ id: planId, ...plan }).onConflictDoUpdate({ target: plans.id, set: plan });
  for (const key of FEATURE_KEYS) {
    const f = FEATURES[key];
    const values = { enabled: true, limitValue: f.limit?.value ?? null, period: f.limit?.period ?? ('none' as Period) };
    await db
      .insert(planEntitlements)
      .values({ planId, featureKey: key, ...values })
      .onConflictDoUpdate({ target: [planEntitlements.planId, planEntitlements.featureKey], set: values });
  }
}
