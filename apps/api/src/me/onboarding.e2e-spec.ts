import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { studyPreferences, subjects, syllabusNodes, tasks, users } from '../db/schema';
import { TasksService } from '../planner/tasks.service';

jest.setTimeout(30000);

describe('onboarding', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
    const nodeIds = [newId(), newId(), newId()];
    await db.insert(syllabusNodes).values(
      ['polity', 'history', 'geography'].map((slug, i) => ({
        id: nodeIds[i], parentId: null, path: slug, level: 0, examStage: 'prelims', paper: 'GS1',
        title: slug, slug, order: i, status: 'published',
      })),
    );
    await db.insert(subjects).values(
      ['polity', 'history', 'geography'].map((slug, i) => ({
        id: newId(), syllabusNodeId: nodeIds[i], slug, title: slug[0].toUpperCase() + slug.slice(1),
        description: 'd', gsPaper: 'GS1', order: i, status: 'published',
      })),
    );
  });
  afterAll(() => close());

  const call = async (method: 'get' | 'put' | 'post', path: string, sub?: string, body?: object) => {
    let r = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (sub) r = r.set('Authorization', `Bearer ${await signTestToken({ sub, email: `${sub}@example.com` })}`);
    return body ? r.send(body) : r;
  };
  const uid = async (sub: string) => (await db.select().from(users).where(eq(users.authSubject, sub)))[0].id;
  const taskCount = async (sub: string) => (await db.select().from(tasks).where(eq(tasks.userId, await uid(sub)))).length;
  const routine = { dailyMin: 120, weeklyMin: 600, windows: ['morning', 'evening'] };

  it('401 when unauthenticated', async () => {
    expect((await call('get', '/me/onboarding')).status).toBe(401);
    expect((await call('put', '/me/onboarding', undefined, { step: 1, answers: {} })).status).toBe(401);
    expect((await call('post', '/me/onboarding/plan-preview', undefined, {})).status).toBe(401);
    expect((await call('post', '/me/onboarding/complete', undefined, { acceptPlan: true })).status).toBe(401);
  });

  it('new user starts at not_started / step 0 / no answers', async () => {
    const r = await call('get', '/me/onboarding', 'ob-new');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ status: 'not_started', step: 0, answers: {} });
  });

  it('save-and-resume keeps merged answers and step', async () => {
    const a = await call('put', '/me/onboarding', 'ob-resume', { step: 1, answers: { targetYear: 2027, stage: 'beginner' } });
    expect(a.status).toBe(200);
    expect(a.body).toEqual({ status: 'in_progress', step: 1, answers: { targetYear: 2027, stage: 'beginner' } });
    const b = await call('put', '/me/onboarding', 'ob-resume', { step: 3, answers: { stage: 'preparing', focus: { papers: 'both' } } });
    expect(b.body).toEqual({
      status: 'in_progress',
      step: 3,
      answers: { targetYear: 2027, stage: 'preparing', focus: { papers: 'both' } },
    });
    expect((await call('get', '/me/onboarding', 'ob-resume')).body).toEqual(b.body);
  });

  it('validates the body', async () => {
    for (const body of [
      { step: 6, answers: {} },
      { step: -1, answers: {} },
      { step: 1, answers: { targetYear: 2030 } },
      { step: 1, answers: { stage: 'expert' } },
      { step: 1, answers: { routine: { dailyMin: 120, weeklyMin: 600, windows: ['dawn'] } } },
      { step: 1, answers: {}, status: 'completed' },
    ]) {
      const r = await call('put', '/me/onboarding', 'ob-val', body);
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe('validation_failed');
    }
  });

  it('skipped leaves the planner empty and home reports skipped', async () => {
    const r = await call('put', '/me/onboarding', 'ob-skip', { step: 2, answers: {}, status: 'skipped' });
    expect(r.body.status).toBe('skipped');
    expect(await taskCount('ob-skip')).toBe(0);
    const h = await call('get', '/home', 'ob-skip');
    expect(h.body.onboarding.status).toBe('skipped');
  });

  it('plan-preview before routine answers is 400 onboarding_incomplete', async () => {
    await call('put', '/me/onboarding', 'ob-early', { step: 1, answers: { targetYear: 2027 } });
    const r = await call('post', '/me/onboarding/plan-preview', 'ob-early', {});
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('onboarding_incomplete');
  });

  it('preview writes nothing and returns starter tasks', async () => {
    await call('put', '/me/onboarding', 'ob-prev', {
      step: 4,
      answers: { targetYear: 2027, focus: { papers: 'prelims', subjects: ['polity', 'history'] }, routine },
    });
    const r = await call('post', '/me/onboarding/plan-preview', 'ob-prev', {});
    expect(r.status).toBe(200);
    expect(r.body.tasks.length).toBeGreaterThan(0);
    expect(r.body.tasks.length).toBeLessThanOrEqual(15);
    expect(r.body.tasks.reduce((s: number, t: { durationMin: number }) => s + t.durationMin, 0)).toBeLessThanOrEqual(600);
    expect(await taskCount('ob-prev')).toBe(0);
    expect((await call('get', '/me/onboarding', 'ob-prev')).body.status).toBe('in_progress');
    // deterministic enough to compare against completion below
    const again = await call('post', '/me/onboarding/plan-preview', 'ob-prev', {});
    expect(again.body).toEqual(r.body);
  });

  it('complete with acceptPlan creates the previewed tasks and fills preferences', async () => {
    await call('put', '/me/onboarding', 'ob-done', {
      step: 5,
      answers: { targetYear: 2028, stage: 'preparing', attempt: 'first', focus: { papers: 'both', subjects: ['polity'] }, routine },
    });
    const preview = (await call('post', '/me/onboarding/plan-preview', 'ob-done', {})).body.tasks;
    const r = await call('post', '/me/onboarding/complete', 'ob-done', { acceptPlan: true });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ createdTasks: preview.length });
    const rows = await db.select().from(tasks).where(eq(tasks.userId, await uid('ob-done')));
    expect(rows).toHaveLength(preview.length);
    expect(new Set(rows.map((t) => t.source))).toEqual(new Set(['starter_plan']));
    expect(rows.map((t) => t.title).sort()).toEqual(preview.map((t: { title: string }) => t.title).sort());

    expect((await call('get', '/me/onboarding', 'ob-done')).body.status).toBe('completed');
    expect((await call('get', '/home', 'ob-done')).body.onboarding.status).toBe('completed');
    expect((await call('get', '/me/preparation-profile', 'ob-done')).body).toMatchObject({
      targetYear: 2028, stage: 'preparing', attempt: 'first', focus: { papers: 'both', subjects: ['polity'] },
    });
    expect((await call('get', '/me/study-preferences', 'ob-done')).body).toMatchObject({
      dailyGoalMin: 120, weeklyGoalMin: 600, windows: ['morning', 'evening'],
    });
  });

  it('complete twice -> 409 already_completed and the task count is unchanged', async () => {
    await call('put', '/me/onboarding', 'ob-twice', { step: 5, answers: { focus: { subjects: ['polity'] }, routine } });
    expect((await call('post', '/me/onboarding/complete', 'ob-twice', { acceptPlan: true })).status).toBe(200);
    const n = await taskCount('ob-twice');
    expect(n).toBeGreaterThan(0);
    const again = await call('post', '/me/onboarding/complete', 'ob-twice', { acceptPlan: true });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('already_completed');
    expect(await taskCount('ob-twice')).toBe(n);
  });

  it('concurrent double submit creates tasks exactly once', async () => {
    await call('put', '/me/onboarding', 'ob-race', { step: 5, answers: { focus: { subjects: ['polity'] }, routine } });
    const results = await Promise.all([
      call('post', '/me/onboarding/complete', 'ob-race', { acceptPlan: true }),
      call('post', '/me/onboarding/complete', 'ob-race', { acceptPlan: true }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const preview = results.find((r) => r.status === 200)!.body.createdTasks;
    expect(await taskCount('ob-race')).toBe(preview);
  });

  it('complete with acceptPlan:false creates no tasks but still saves preferences', async () => {
    await call('put', '/me/onboarding', 'ob-decline', { step: 5, answers: { targetYear: 2027, routine } });
    const r = await call('post', '/me/onboarding/complete', 'ob-decline', { acceptPlan: false });
    expect(r.body).toEqual({ createdTasks: 0 });
    expect(await taskCount('ob-decline')).toBe(0);
    expect((await call('get', '/me/study-preferences', 'ob-decline')).body.weeklyGoalMin).toBe(600);
    expect((await call('get', '/me/onboarding', 'ob-decline')).body.status).toBe('completed');
  });

  it('complete with acceptPlan:true but no routine is 400 and does not complete', async () => {
    await call('put', '/me/onboarding', 'ob-noroutine', { step: 5, answers: { targetYear: 2027 } });
    const r = await call('post', '/me/onboarding/complete', 'ob-noroutine', { acceptPlan: true });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('onboarding_incomplete');
    expect((await call('get', '/me/onboarding', 'ob-noroutine')).body.status).toBe('in_progress');
  });

  it('complete validates the body', async () => {
    const r = await call('post', '/me/onboarding/complete', 'ob-badbody', { acceptPlan: 'yes' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('validation_failed');
  });

  it('isolation: one user\'s onboarding, plan and tasks never touch another\'s', async () => {
    await call('put', '/me/onboarding', 'ob-a', { step: 5, answers: { targetYear: 2027, focus: { subjects: ['polity'] }, routine } });
    await call('post', '/me/onboarding/complete', 'ob-a', { acceptPlan: true });
    const b = await call('get', '/me/onboarding', 'ob-b');
    expect(b.body).toEqual({ status: 'not_started', step: 0, answers: {} });
    expect(await taskCount('ob-b')).toBe(0);
    // B completing must not be blocked by A's completion, and B cannot preview A's answers
    expect((await call('post', '/me/onboarding/plan-preview', 'ob-b', {})).status).toBe(400);
    const done = await call('post', '/me/onboarding/complete', 'ob-b', { acceptPlan: false });
    expect(done.status).toBe(200);
    expect((await call('get', '/me/preparation-profile', 'ob-b')).body.targetYear).toBeNull();
    expect((await call('get', '/me/preparation-profile', 'ob-a')).body.targetYear).toBe(2027);
  });
  it('a failure during complete rolls everything back and a retry succeeds', async () => {
    await call('put', '/me/onboarding', 'ob-fail', { step: 5, answers: { targetYear: 2027, focus: { subjects: ['polity'] }, routine } });
    const svc = app.get(TasksService);
    const spy = jest.spyOn(svc, 'createMany').mockRejectedValueOnce(new Error('boom'));
    const r = await call('post', '/me/onboarding/complete', 'ob-fail', { acceptPlan: true });
    spy.mockRestore();
    expect(r.status).toBeGreaterThanOrEqual(500);
    expect((await call('get', '/me/onboarding', 'ob-fail')).body.status).toBe('in_progress');
    expect(await taskCount('ob-fail')).toBe(0);
    expect(await db.select().from(studyPreferences).where(eq(studyPreferences.userId, await uid('ob-fail')))).toHaveLength(0);
    expect((await call('get', '/me/preparation-profile', 'ob-fail')).body.targetYear).toBeNull();
    const retry = await call('post', '/me/onboarding/complete', 'ob-fail', { acceptPlan: true });
    expect(retry.status).toBe(200);
    expect(await taskCount('ob-fail')).toBe(retry.body.createdTasks);
    expect(retry.body.createdTasks).toBeGreaterThan(0);
  });

  describe('empty catalog', () => {
    beforeAll(async () => {
      await db.update(subjects).set({ status: 'draft' });
    });
    afterAll(async () => {
      await db.update(subjects).set({ status: 'published' });
    });

    it('preview and complete(acceptPlan:true) are 409 catalog_empty and leave state unchanged', async () => {
      await call('put', '/me/onboarding', 'ob-empty', { step: 5, answers: { targetYear: 2027, routine } });
      for (const [path, body] of [['/me/onboarding/plan-preview', {}], ['/me/onboarding/complete', { acceptPlan: true }]] as const) {
        const r = await call('post', path, 'ob-empty', body);
        expect(r.status).toBe(409);
        expect(r.body.error.code).toBe('catalog_empty');
      }
      expect((await call('get', '/me/onboarding', 'ob-empty')).body.status).toBe('in_progress');
      expect(await taskCount('ob-empty')).toBe(0);
    });

    it('complete(acceptPlan:false) still works', async () => {
      await call('put', '/me/onboarding', 'ob-empty2', { step: 5, answers: { routine } });
      const r = await call('post', '/me/onboarding/complete', 'ob-empty2', { acceptPlan: false });
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ createdTasks: 0 });
    });
  });
});
