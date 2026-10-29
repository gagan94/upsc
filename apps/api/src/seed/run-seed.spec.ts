import { eq, sql } from 'drizzle-orm';
import { createTestDb } from '../../test/db';
import type { Db } from '../db/db.module';
import { featureCatalog, planEntitlements, plans, users } from '../db/schema';
import { FEATURE_KEYS } from '../billing/feature-keys';
import { FakeAuthAdmin, type AuthAdmin } from './auth-admin';
import { runSeed } from './run-seed';

jest.setTimeout(30000);

const TABLES = [
  'identity.users',
  'identity.profiles',
  'billing.feature_catalog',
  'billing.plans',
  'billing.plan_entitlements',
  'catalog.syllabus_nodes',
  'catalog.subjects',
  'catalog.modules',
  'catalog.activities',
  'catalog.lessons',
];

describe('runSeed', () => {
  let db: Db;
  let close: () => Promise<void>;
  const authAdmin = new FakeAuthAdmin();
  const opts = { demoPassword: 'test-password-1', authAdmin };

  const counts = async (): Promise<Record<string, number>> => {
    const out: Record<string, number> = {};
    for (const t of TABLES) {
      const r = await db.execute(sql.raw(`select count(*)::int as c from ${t}`));
      const rows = (Array.isArray(r) ? r : (r as { rows: unknown[] }).rows) as { c: number }[];
      out[t] = rows[0].c;
    }
    return out;
  };

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
  });
  afterAll(async () => {
    await close();
  });

  const expected = { users: 2, plans: 1, subjects: 8, modules: 12, activities: 23, lessons: 15 };

  it('seeds the demo dataset and is idempotent', async () => {
    expect(await runSeed(db, opts)).toEqual(expected);
    const before = await counts();
    expect(await runSeed(db, opts)).toEqual(expected);
    expect(await counts()).toEqual(before);
    expect(before['identity.profiles']).toBe(2);
  });

  it('creates users with roles linked to auth subjects', async () => {
    const [admin] = await db.select().from(users).where(eq(users.email, 'admin@example.com'));
    const [student] = await db.select().from(users).where(eq(users.email, 'student@example.com'));
    expect(admin.roles).toEqual(['admin']);
    expect(student.roles).toEqual(['student']);
    expect(student.name).toBe('Vinayaka');
    expect(admin.authSubject).toBe((await authAdmin.ensureUser({ email: 'admin@example.com', password: 'x', name: 'Admin' })).subject);
    expect(student.authSubject).toBe(
      (await authAdmin.ensureUser({ email: 'student@example.com', password: 'x', name: 'Vinayaka' })).subject,
    );
  });

  it('gives the default free plan an entitlement for every feature key', async () => {
    const [free] = await db.select().from(plans).where(eq(plans.key, 'free'));
    expect(free.isDefault).toBe(true);
    const ents = await db.select().from(planEntitlements).where(eq(planEntitlements.planId, free.id));
    expect(ents.map((e) => e.featureKey).sort()).toEqual([...FEATURE_KEYS].sort());
    expect(ents.every((e) => e.enabled)).toBe(true);
    const ask = ents.find((e) => e.featureKey === 'ai.ask.message');
    expect(ask).toMatchObject({ limitValue: 50, period: 'day' });
    expect((await db.select().from(featureCatalog)).length).toBe(FEATURE_KEYS.length);
  });

  it('FakeAuthAdmin returns the same subject for the same email', async () => {
    const a = new FakeAuthAdmin();
    const i = { email: 'x@example.com', password: 'p', name: 'X' };
    expect((await a.ensureUser(i)).subject).toBe((await a.ensureUser(i)).subject);
    expect(a.calls).toHaveLength(2);
  });
});

describe('runSeed when the auth admin refuses a user', () => {
  it('aborts before any user or role is written', async () => {
    const { db, close } = await createTestDb();
    try {
      const fake = new FakeAuthAdmin();
      const authAdmin: AuthAdmin = {
        ensureUser: async (i) => {
          if (i.email === 'admin@example.com') throw new Error('admin@example.com: not created by the seed');
          return fake.ensureUser(i);
        },
      };
      await expect(runSeed(db, { demoPassword: 'test-password-1', authAdmin })).rejects.toThrow(/not created by the seed/);
      const rows = await db.select().from(users);
      expect(rows).toEqual([]);
    } finally {
      await close();
    }
  });
});
