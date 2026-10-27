import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { users } from '../db/schema';
import { FakeAuthAdmin } from '../seed/auth-admin';
import { runSeed } from '../seed/run-seed';

jest.setTimeout(30000);

describe('admin API', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;
  let adminToken: string;
  let seededStudentToken: string;
  let otherStudentToken: string;

  const get = (path: string, token?: string) => {
    const r = request(app.getHttpServer()).get(`/api/v1${path}`);
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
    await runSeed(db, { demoPassword: 'pw-demo-1234', authAdmin: new FakeAuthAdmin() });
    const sub = async (email: string) =>
      (await db.select({ s: users.authSubject }).from(users).where(eq(users.email, email)))[0].s;
    adminToken = await signTestToken({ sub: await sub('admin@example.com'), email: 'admin@example.com' });
    seededStudentToken = await signTestToken({ sub: await sub('student@example.com'), email: 'student@example.com' });
    otherStudentToken = await signTestToken({ sub: 'someone-else', email: 'someone@example.com' });
  });
  afterAll(() => close());

  describe.each(['/admin/users', '/admin/plans'])('%s', (path) => {
    it('401 without a token', async () => {
      const res = await get(path).expect(401);
      expect(res.body.error.code).toBe('unauthenticated');
    });

    it.each([['seeded student'], ['other student']])('403 for a %s with no data in the body', async (who) => {
      const res = await get(path, who === 'seeded student' ? seededStudentToken : otherStudentToken).expect(403);
      expect(res.body.error.code).toBe('forbidden');
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('example.com');
      expect(body).not.toContain('"users"');
      expect(body).not.toContain('"plans"');
    });
  });

  describe('GET /admin/users', () => {
    it('lists users without auth internals', async () => {
      const res = await get('/admin/users', adminToken).expect(200);
      const emails = res.body.users.map((u: { email: string }) => u.email);
      expect(emails).toEqual(expect.arrayContaining(['student@example.com', 'admin@example.com']));
      expect(res.body.nextCursor).toBeNull();
      for (const u of res.body.users) {
        expect(Object.keys(u).sort()).toEqual(['createdAt', 'email', 'id', 'lastLoginAt', 'name', 'roles', 'status']);
      }
      const body = JSON.stringify(res.body);
      expect(body).not.toContain('authSubject');
      expect(body).not.toContain('authProvider');
    });

    it('paginates with an opaque cursor, stably', async () => {
      const all = (await get('/admin/users', adminToken).expect(200)).body.users;
      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const res: request.Response = await get(`/admin/users?limit=1${cursor ? `&cursor=${cursor}` : ''}`, adminToken).expect(200);
        expect(res.body.users).toHaveLength(1);
        seen.push(res.body.users[0].id);
        cursor = res.body.nextCursor;
        pages++;
        if (cursor) expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
      } while (cursor && pages < 20);
      expect(seen).toEqual(all.map((u: { id: string }) => u.id));
      expect(new Set(seen).size).toBe(seen.length);
      expect(seen.length).toBeGreaterThanOrEqual(3); // two seeded + provisioned students from the 403 tests
    });

    it('orders by (createdAt, id) ascending', async () => {
      const list = (await get('/admin/users', adminToken).expect(200)).body.users as { id: string; createdAt: string }[];
      const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      expect(list.map((u) => u.id)).toEqual(sorted.map((u) => u.id));
    });

    it('clamps limit to 1..100 and defaults invalid values', async () => {
      expect((await get('/admin/users?limit=0', adminToken).expect(200)).body.users).toHaveLength(1);
      expect((await get('/admin/users?limit=-5', adminToken).expect(200)).body.users).toHaveLength(1);
      expect((await get('/admin/users?limit=100000', adminToken).expect(200)).body.users.length).toBeGreaterThan(0);
      expect((await get('/admin/users?limit=abc', adminToken).expect(200)).body.users.length).toBeGreaterThan(1);
    });

    it('400 invalid_cursor for malformed cursors', async () => {
      const bad = [
        'not-a-cursor',
        '!!!',
        Buffer.from('garbage').toString('base64url'),
        Buffer.from('2020-01-01T00:00:00.000Z|not-a-uuid').toString('base64url'),
        Buffer.from("x'; drop table|00000000-0000-0000-0000-000000000000").toString('base64url'),
      ];
      for (const c of bad) {
        const res = await get(`/admin/users?cursor=${encodeURIComponent(c)}`, adminToken).expect(400);
        expect(res.body.error.code).toBe('invalid_cursor');
      }
    });
  });

  describe('GET /admin/plans', () => {
    it('returns free with 13 entitlements ordered by featureKey', async () => {
      const res = await get('/admin/plans', adminToken).expect(200);
      const free = res.body.plans.find((p: { key: string }) => p.key === 'free');
      expect(free).toMatchObject({ key: 'free', isDefault: true });
      expect(typeof free.name).toBe('string');
      expect(free.entitlements).toHaveLength(13);
      expect(Object.keys(free.entitlements[0]).sort()).toEqual(['enabled', 'featureKey', 'limitValue', 'period']);
      const keys = free.entitlements.map((e: { featureKey: string }) => e.featureKey);
      expect(keys).toEqual([...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    });
  });
});
