import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';

jest.setTimeout(30000);

describe('profile, preparation profile and study preferences', () => {
  let app: INestApplication;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ app, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
  });
  afterAll(() => close());

  const tokenFor = (sub: string) => signTestToken({ sub, email: `${sub}@example.com` });
  const call = async (method: 'get' | 'put' | 'patch', path: string, sub?: string, body?: object) => {
    let r = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (sub) r = r.set('Authorization', `Bearer ${await tokenFor(sub)}`);
    return body ? r.send(body) : r;
  };

  it('401 when unauthenticated', async () => {
    await call('get', '/me/profile').then((r) => expect(r.status).toBe(401));
    await call('patch', '/me', undefined, { name: 'x' }).then((r) => expect(r.status).toBe(401));
    await call('get', '/me/preparation-profile').then((r) => expect(r.status).toBe(401));
    await call('put', '/me/study-preferences', undefined, {}).then((r) => expect(r.status).toBe(401));
  });

  it('returns defaults for a new user without creating rows', async () => {
    const prep = await call('get', '/me/preparation-profile', 'def-1');
    expect(prep.status).toBe(200);
    expect(prep.body).toMatchObject({
      targetYear: null,
      stage: null,
      attempt: null,
      focus: {},
      medium: 'en',
      onboardingStatus: 'not_started',
      onboardingStep: 0,
    });
    const prefs = await call('get', '/me/study-preferences', 'def-1');
    expect(prefs.body).toMatchObject({
      dailyGoalMin: 240,
      weeklyGoalMin: 1680,
      windows: [],
      weekStart: 'monday',
      defaultSessionMin: 25,
      remindersEnabled: false,
    });
    const profile = await call('get', '/me/profile', 'def-1');
    expect(profile.body).toEqual({
      name: 'def-1',
      email: 'def-1@example.com',
      bio: null,
      location: null,
      timezone: 'Asia/Kolkata',
    });
  });

  it('PUT then GET round-trips preparation profile and study preferences', async () => {
    const put = await call('put', '/me/preparation-profile', 'rt-1', {
      targetYear: 2027,
      stage: 'preparing',
      attempt: 'first',
      focus: { papers: 'both', subjects: ['polity', 'history'] },
    });
    expect(put.status).toBe(200);
    const get = await call('get', '/me/preparation-profile', 'rt-1');
    expect(get.body).toMatchObject({
      targetYear: 2027,
      stage: 'preparing',
      attempt: 'first',
      focus: { papers: 'both', subjects: ['polity', 'history'] },
    });

    const prefsPut = await call('put', '/me/study-preferences', 'rt-1', {
      dailyGoalMin: 300,
      weeklyGoalMin: 2000,
      windows: ['morning', 'night'],
      weekStart: 'sunday',
      defaultSessionMin: 45,
      remindersEnabled: true,
    });
    expect(prefsPut.status).toBe(200);
    const prefs = await call('get', '/me/study-preferences', 'rt-1');
    expect(prefs.body).toMatchObject({
      dailyGoalMin: 300,
      weeklyGoalMin: 2000,
      windows: ['morning', 'night'],
      weekStart: 'sunday',
      defaultSessionMin: 45,
      remindersEnabled: true,
    });
  });

  it('PATCH /me updates name, bio, location and timezone; GET /me reflects it', async () => {
    const res = await call('patch', '/me', 'patch-1', {
      name: 'Asha Rao',
      bio: 'Aspirant',
      location: 'Pune',
      timezone: 'Asia/Dubai',
    });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Asha Rao', timezone: 'Asia/Dubai' });
    const me = await call('get', '/me', 'patch-1');
    expect(me.body.user).toMatchObject({ name: 'Asha Rao', timezone: 'Asia/Dubai' });
    expect(Object.keys(me.body.user).sort()).toEqual(['email', 'id', 'locale', 'name', 'roles', 'timezone']);
    const profile = await call('get', '/me/profile', 'patch-1');
    expect(profile.body).toMatchObject({ name: 'Asha Rao', bio: 'Aspirant', location: 'Pune', timezone: 'Asia/Dubai' });
  });

  it('rejects invalid input with 400 validation_failed', async () => {
    const tz = await call('patch', '/me', 'bad-1', { timezone: 'Mars/Base' });
    expect(tz.status).toBe(400);
    expect(tz.body.error.code).toBe('validation_failed');
    expect((await call('patch', '/me', 'bad-1', { name: '' })).status).toBe(400);
    expect((await call('patch', '/me', 'bad-1', { bio: 'x'.repeat(501) })).status).toBe(400);
    const goal = await call('put', '/me/study-preferences', 'bad-1', { dailyGoalMin: 5 });
    expect(goal.status).toBe(400);
    expect(goal.body.error.code).toBe('validation_failed');
    expect((await call('put', '/me/study-preferences', 'bad-1', { windows: ['dawn'] })).status).toBe(400);
    expect((await call('put', '/me/study-preferences', 'bad-1', { defaultSessionMin: 22 })).status).toBe(400);
    expect((await call('put', '/me/preparation-profile', 'bad-1', { targetYear: 2030 })).status).toBe(400);
  });

  it("user B's writes do not change user A's data", async () => {
    await call('put', '/me/preparation-profile', 'iso-a', { targetYear: 2027, stage: 'beginner', focus: {} });
    await call('put', '/me/study-preferences', 'iso-a', { dailyGoalMin: 100 });
    await call('patch', '/me', 'iso-a', { name: 'Alice' });
    await call('put', '/me/preparation-profile', 'iso-b', { targetYear: 2028, stage: 'revision', focus: {} });
    await call('put', '/me/study-preferences', 'iso-b', { dailyGoalMin: 500 });
    await call('patch', '/me', 'iso-b', { name: 'Bob' });
    const a = await call('get', '/me/preparation-profile', 'iso-a');
    expect(a.body).toMatchObject({ targetYear: 2027, stage: 'beginner' });
    expect((await call('get', '/me/study-preferences', 'iso-a')).body.dailyGoalMin).toBe(100);
    expect((await call('get', '/me/profile', 'iso-a')).body.name).toBe('Alice');
    const b = await call('get', '/me/preparation-profile', 'iso-b');
    expect(b.body).toMatchObject({ targetYear: 2028, stage: 'revision' });
    expect((await call('get', '/me/study-preferences', 'iso-b')).body.dailyGoalMin).toBe(500);
  });
});
