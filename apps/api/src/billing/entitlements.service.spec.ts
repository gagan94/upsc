import { eq } from 'drizzle-orm';
import { createTestDb } from '../../test/db';
import { AppError } from '../common/errors';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import {
  entitlementOverrides,
  featureCatalog,
  planEntitlements,
  plans,
  subscriptions,
  usageCounters,
  users,
} from '../db/schema';
import { FEATURE_KEYS } from './feature-keys';
import { EntitlementsService } from './entitlements.service';

jest.setTimeout(30000);

const IST_DAY_MS = 24 * 3600 * 1000;
const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const nextIstMidnight = () =>
  new Date(Math.ceil((Date.now() + IST_OFFSET_MS) / IST_DAY_MS) * IST_DAY_MS - IST_OFFSET_MS);

describe('FEATURE_KEYS', () => {
  it('has the 13 keys', () => expect(FEATURE_KEYS).toHaveLength(13));
});

describe('EntitlementsService', () => {
  let db: Db;
  let close: () => Promise<void>;
  let svc: EntitlementsService;
  let freeId: string;
  let proId: string;

  const mkUser = async (tz = 'Asia/Kolkata') => {
    const id = newId();
    await db.insert(users).values({ id, authSubject: id, email: `${id}@x.com`, name: 'U', timezone: tz });
    return id;
  };

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
    svc = new EntitlementsService(db);
    await db.insert(featureCatalog).values([
      { key: 'ai.ask.message', name: 'Ask', type: 'limit', defaultPeriod: 'day' },
      { key: 'notes.offline', name: 'Offline', type: 'boolean', defaultPeriod: 'none' },
      { key: 'forum.post', name: 'Forum', type: 'boolean', defaultPeriod: 'none' },
    ]);
    freeId = newId();
    proId = newId();
    await db.insert(plans).values([
      { id: freeId, key: 'free', name: 'Free', isDefault: true, status: 'active' },
      { id: proId, key: 'pro', name: 'Pro', isDefault: false, status: 'active' },
    ]);
    await db.insert(planEntitlements).values([
      { planId: freeId, featureKey: 'ai.ask.message', enabled: true, limitValue: 3, period: 'day' },
      { planId: freeId, featureKey: 'notes.offline', enabled: false, limitValue: null, period: 'none' },
      { planId: freeId, featureKey: 'forum.post', enabled: true, limitValue: null, period: 'none' },
      { planId: proId, featureKey: 'ai.ask.message', enabled: true, limitValue: 50, period: 'day' },
    ]);
  });
  afterAll(() => close());

  it('within limit: allowed with remaining 2 after one consume', async () => {
    const u = await mkUser();
    await svc.consume(u, 'ai.ask.message');
    expect(await svc.check(u, 'ai.ask.message')).toEqual({ allowed: true, remaining: 2 });
  });

  it('fourth consume throws quota_exceeded with resetsAt = next IST midnight', async () => {
    const u = await mkUser();
    for (let i = 0; i < 3; i++) await svc.consume(u, 'ai.ask.message');
    const err = await svc.consume(u, 'ai.ask.message').catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.getStatus()).toBe(429);
    expect(err.code).toBe('quota_exceeded');
    expect(err.extra.resetsAt).toBe(nextIstMidnight().toISOString());
    const res = await svc.check(u, 'ai.ask.message');
    expect(res).toEqual({ allowed: false, reason: 'quota_exceeded', resetsAt: nextIstMidnight() });
  });

  it('cost greater than limit is rejected on first insert and writes nothing', async () => {
    const u = await mkUser();
    await expect(svc.consume(u, 'ai.ask.message', 4)).rejects.toMatchObject({ code: 'quota_exceeded' });
    expect(await db.select().from(usageCounters).where(eq(usageCounters.userId, u))).toHaveLength(0);
  });

  it('disabled feature: entitlement_required (402)', async () => {
    const u = await mkUser();
    expect(await svc.check(u, 'notes.offline')).toEqual({ allowed: false, reason: 'entitlement_required' });
    const err = await svc.consume(u, 'notes.offline').catch((e) => e);
    expect(err.getStatus()).toBe(402);
    expect(err.code).toBe('entitlement_required');
  });

  it('feature absent from every plan is denied', async () => {
    const u = await mkUser();
    expect(await svc.check(u, 'revision.basic')).toMatchObject({ reason: 'entitlement_required' });
  });

  it('boolean-enabled feature: allowed, remaining null, nothing incremented', async () => {
    const u = await mkUser();
    await svc.consume(u, 'forum.post');
    expect(await svc.check(u, 'forum.post')).toEqual({ allowed: true, remaining: null });
    expect(await db.select().from(usageCounters).where(eq(usageCounters.userId, u))).toHaveLength(0);
  });

  it('an override with limitValue 10 beats the plan', async () => {
    const u = await mkUser();
    await db.insert(entitlementOverrides).values({
      id: newId(), userId: u, featureKey: 'ai.ask.message', enabled: true, limitValue: 10, period: 'day', reason: 't',
    });
    expect(await svc.check(u, 'ai.ask.message')).toEqual({ allowed: true, remaining: 10 });
  });

  it('an override can enable a disabled feature', async () => {
    const u = await mkUser();
    await db.insert(entitlementOverrides).values({
      id: newId(), userId: u, featureKey: 'notes.offline', enabled: true, period: 'none', reason: 't',
    });
    expect(await svc.check(u, 'notes.offline')).toEqual({ allowed: true, remaining: null });
  });

  it('an expired override is ignored', async () => {
    const u = await mkUser();
    await db.insert(entitlementOverrides).values({
      id: newId(), userId: u, featureKey: 'ai.ask.message', enabled: true, limitValue: 10, period: 'day',
      expiresAt: new Date(Date.now() - 1000), reason: 't',
    });
    expect(await svc.check(u, 'ai.ask.message')).toEqual({ allowed: true, remaining: 3 });
  });

  it('a subscription to a plan with a higher limit applies', async () => {
    const u = await mkUser();
    await db.insert(subscriptions).values({ id: newId(), userId: u, planId: proId, status: 'active' });
    expect(await svc.check(u, 'ai.ask.message')).toEqual({ allowed: true, remaining: 50 });
  });

  it('inactive or lapsed subscriptions fall back to the default plan', async () => {
    const u1 = await mkUser();
    await db.insert(subscriptions).values({ id: newId(), userId: u1, planId: proId, status: 'cancelled' });
    expect(await svc.check(u1, 'ai.ask.message')).toEqual({ allowed: true, remaining: 3 });
    const u2 = await mkUser();
    await db.insert(subscriptions).values({
      id: newId(), userId: u2, planId: proId, status: 'active', currentPeriodEnd: new Date(Date.now() - 1000),
    });
    expect(await svc.check(u2, 'ai.ask.message')).toEqual({ allowed: true, remaining: 3 });
  });

  it('two concurrent consumes at count 2 of limit 3: exactly one succeeds', async () => {
    // NOTE: PGlite serialises queries; this validates the SQL's atomic conditional
    // logic, not Postgres row-lock behaviour under real concurrency.
    const u = await mkUser();
    await svc.consume(u, 'ai.ask.message');
    await svc.consume(u, 'ai.ask.message');
    const results = await Promise.allSettled([
      svc.consume(u, 'ai.ask.message'),
      svc.consume(u, 'ai.ask.message'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason.code).toBe('quota_exceeded');
    const rows = await db.select().from(usageCounters).where(eq(usageCounters.userId, u));
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(3);
  });

  it('usage lists limited features with used, limit and resetsAt', async () => {
    const u = await mkUser();
    await svc.consume(u, 'ai.ask.message');
    await svc.consume(u, 'ai.ask.message');
    const usage = await svc.usage(u);
    expect(usage.find((x) => x.key === 'ai.ask.message')).toEqual({
      key: 'ai.ask.message', used: 2, limit: 3, resetsAt: nextIstMidnight(),
    });
    expect(usage.find((x) => x.key === 'forum.post')).toEqual({
      key: 'forum.post', used: 0, limit: null, resetsAt: null,
    });
    expect(usage.find((x) => x.key === 'notes.offline')).toBeUndefined();
  });
});
