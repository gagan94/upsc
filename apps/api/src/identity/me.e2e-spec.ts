import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { profiles, users } from '../db/schema';
import { AuthGuard } from './auth.guard';
import { Roles } from './decorators';
import { RolesGuard } from './roles.guard';

jest.setTimeout(30000);

@Controller('admin-only')
@UseGuards(AuthGuard, RolesGuard)
class AdminController {
  @Get()
  @Roles('admin')
  get() {
    return { ok: true };
  }
}

describe('GET /me', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
      controllers: [AdminController],
    }));
  });
  afterAll(() => close());

  const me = (token?: string) => {
    const r = request(app.getHttpServer()).get('/api/v1/me');
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };

  it('401 without a header', async () => {
    const res = await me().expect(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });

  it('401 with an invalid token', async () => {
    const res = await me('garbage').expect(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });

  it('provisions a new user: lowercased email, student role, one users and one profiles row', async () => {
    const token = await signTestToken({ sub: 'new-1', email: '  New.User@Example.COM ' });
    const res = await me(token).expect(200);
    expect(res.body.user.email).toBe('new.user@example.com');
    expect(res.body.user.roles).toEqual(['student']);
    const rows = await db.select().from(users).where(eq(users.authSubject, 'new-1'));
    expect(rows).toHaveLength(1);
    const profs = await db.select().from(profiles).where(eq(profiles.userId, rows[0].id));
    expect(profs).toHaveLength(1);
    // second call reuses the same user
    const again = await me(token).expect(200);
    expect(again.body.user.id).toBe(res.body.user.id);
  });

  it('ignores roles in user_metadata', async () => {
    const token = await signTestToken({
      sub: 'sneaky',
      email: 'sneaky@example.com',
      user_metadata: { roles: ['admin'] },
    });
    const res = await me(token).expect(200);
    expect(res.body.user.roles).toEqual(['student']);
  });

  it('five parallel first calls create exactly one user', async () => {
    const token = await signTestToken({ sub: 'race-1', email: 'race@example.com' });
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => me(token)));
    for (const r of results) expect(r.status).toBe(200);
    expect(new Set(results.map((r) => r.body.user.id)).size).toBe(1);
    const rows = await db.select().from(users).where(eq(users.authSubject, 'race-1'));
    expect(rows).toHaveLength(1);
    const profs = await db.select().from(profiles).where(eq(profiles.userId, rows[0].id));
    expect(profs).toHaveLength(1);
  });

  it('syncs a changed email', async () => {
    await me(await signTestToken({ sub: 'chg', email: 'old@example.com' })).expect(200);
    const res = await me(await signTestToken({ sub: 'chg', email: 'New@Example.com' })).expect(200);
    expect(res.body.user.email).toBe('new@example.com');
  });

  it('@Roles("admin"): 403 for student, 200 once DB roles include admin', async () => {
    const token = await signTestToken({ sub: 'role-1', email: 'role@example.com' });
    const get = () =>
      request(app.getHttpServer()).get('/api/v1/admin-only').set('Authorization', `Bearer ${token}`);
    const denied = await get().expect(403);
    expect(denied.body.error.code).toBe('forbidden');
    await db.update(users).set({ roles: ['admin'] }).where(eq(users.authSubject, 'role-1'));
    await get().expect(200);
  });

  it('admin route without a token is 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin-only').expect(401);
  });
});
