import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { examDates, studyPreferences, studySessions, subjects, syllabusNodes, users } from '../db/schema';

jest.setTimeout(30000);

describe('planner goals, progress and exam dates', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;
  let subjA: string;
  let subjB: string;

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
    subjA = newId();
    subjB = newId();
    for (const [id, title] of [[subjA, 'Polity'], [subjB, 'Economy']]) {
      await db.insert(syllabusNodes).values({
        id, path: `/${title}`, level: 1, examStage: 'prelims', paper: 'gs1', title, slug: `goals-${title.toLowerCase()}`, status: 'published',
      });
    }
  });
  afterAll(() => close());

  const call = async (method: 'get' | 'post' | 'put', path: string, sub?: string, body?: object) => {
    let r = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (sub) r = r.set('Authorization', `Bearer ${await signTestToken({ sub, email: `${sub}@example.com` })}`);
    return body ? r.send(body) : r;
  };
  const mkTask = async (sub: string, body: object) => {
    const r = await call('post', '/planner/tasks', sub, body);
    expect(r.status).toBe(201);
    return r.body.task as { id: string };
  };
  const uid = async (sub: string) => (await db.select().from(users).where(eq(users.authSubject, sub)))[0].id;
  const session = async (sub: string, o: { startedAt: string; activeSeconds: number; status?: 'ended' | 'discarded'; taskId?: string; subjectNodeId?: string }) => {
    await call('get', '/planner/goals', sub); // ensures the user row exists
    await db.insert(studySessions).values({
      id: newId(), userId: await uid(sub), plannedMin: 25, startedAt: new Date(o.startedAt), endedAt: new Date(o.startedAt),
      activeSeconds: o.activeSeconds, status: o.status ?? 'ended', taskId: o.taskId ?? null, subjectNodeId: o.subjectNodeId ?? null,
    });
  };

  it('401 when unauthenticated', async () => {
    for (const p of ['/planner/goals', '/planner/progress', '/planner/exam-dates']) expect((await call('get', p)).status).toBe(401);
    expect((await call('put', '/planner/goals', undefined, { dailyMin: 60, weeklyMin: 300 })).status).toBe(401);
  });

  it('goals default from study preferences, then persist', async () => {
    const first = await call('get', '/planner/goals', 'u-goal');
    expect(first.status).toBe(200);
    expect(first.body.goals).toEqual({
      dailyMin: 240, weeklyMin: 1680, monthlyMilestone: null, milestoneDate: null, subjectTargets: [],
    });

    await db.insert(studyPreferences).values({ userId: await uid('u-goal'), dailyGoalMin: 120, weeklyGoalMin: 700 });
    expect((await call('get', '/planner/goals', 'u-goal')).body.goals).toMatchObject({ dailyMin: 120, weeklyMin: 700 });

    const put = await call('put', '/planner/goals', 'u-goal', {
      dailyMin: 90, weeklyMin: 600, monthlyMilestone: 'Finish Polity', milestoneDate: '2026-11-30',
      subjectTargets: [{ subjectNodeId: subjA, weeklyMin: 200 }],
    });
    expect(put.status).toBe(200);
    const expected = {
      dailyMin: 90, weeklyMin: 600, monthlyMilestone: 'Finish Polity', milestoneDate: '2026-11-30',
      subjectTargets: [{ subjectNodeId: subjA, weeklyMin: 200 }],
    };
    expect(put.body.goals).toEqual(expected);
    expect((await call('get', '/planner/goals', 'u-goal')).body.goals).toEqual(expected);
  });

  it('PUT validation: dailyMin must not exceed weeklyMin, other bad input is 400 validation_failed', async () => {
    const bad = await call('put', '/planner/goals', 'u-goalbad', { dailyMin: 500, weeklyMin: 300 });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('validation_failed');
    const equal = await call('put', '/planner/goals', 'u-goalbad', { dailyMin: 300, weeklyMin: 300 });
    expect(equal.status).toBe(200);
    for (const body of [
      { dailyMin: 0, weeklyMin: 300 },
      { dailyMin: 60, weeklyMin: 99999 },
      { dailyMin: 60, weeklyMin: 300, milestoneDate: '2026-02-31' },
      { dailyMin: 60, weeklyMin: 300, subjectTargets: [{ subjectNodeId: 'nope', weeklyMin: 10 }] },
      { dailyMin: 60, weeklyMin: 300, subjectTargets: [{ subjectNodeId: subjA, weeklyMin: 10 }, { subjectNodeId: subjA, weeklyMin: 20 }] },
      { dailyMin: 60, weeklyMin: 300, subjectTargets: [{ subjectNodeId: newId(), weeklyMin: 10 }] },
    ]) {
      const r = await call('put', '/planner/goals', 'u-goalbad', body);
      expect([r.status, r.body.error.code]).toEqual([400, 'validation_failed']);
    }
    // partial update merges over the current goals, and is still checked
    const partial = await call('put', '/planner/goals', 'u-goalbad', { weeklyMin: 100 });
    expect(partial.status).toBe(400);
  });

  it('PUT rejects a catalog subject id (not a syllabus node) in subjectTargets and stores nothing', async () => {
    const catalogSubjectId = newId();
    await db.insert(subjects).values({
      id: catalogSubjectId, syllabusNodeId: subjA, slug: 'goals-catalog-polity', title: 'Polity', description: 'd', gsPaper: 'GS II', order: 1, status: 'published',
    });
    const r = await call('put', '/planner/goals', 'u-goalcat', { dailyMin: 60, weeklyMin: 300, subjectTargets: [{ subjectNodeId: catalogSubjectId, weeklyMin: 60 }] });
    expect([r.status, r.body.error.code]).toEqual([400, 'validation_failed']);
    expect((await call('get', '/planner/goals', 'u-goalcat')).body.goals.subjectTargets).toEqual([]);
    const ok = await call('put', '/planner/goals', 'u-goalcat', { dailyMin: 60, weeklyMin: 300, subjectTargets: [{ subjectNodeId: subjA, weeklyMin: 60 }] });
    expect(ok.status).toBe(200);
  });

  describe('weekly progress', () => {
    const sub = 'u-prog';
    // Week of Mon 2026-10-12 (IST). Mon 09:00 IST = 03:30Z.
    let doneTask: string;
    beforeAll(async () => {
      await call('put', '/planner/goals', sub, {
        dailyMin: 120, weeklyMin: 600, subjectTargets: [{ subjectNodeId: subjA, weeklyMin: 300 }],
      });
      doneTask = (await mkTask(sub, { title: 'Read polity', subjectNodeId: subjA, durationMin: 60, scheduledStart: '2026-10-12T03:30:00Z' })).id;
      await call('post', `/planner/tasks/${doneTask}/complete`, sub, {});
      await mkTask(sub, { title: 'Economy notes', subjectNodeId: subjB, durationMin: 30, scheduledStart: '2026-10-12T08:00:00Z' });
      const skipped = await mkTask(sub, { title: 'Skipped polity', subjectNodeId: subjA, durationMin: 45, scheduledStart: '2026-10-14T04:00:00Z' });
      await call('post', `/planner/tasks/${skipped.id}/skip`, sub);
      // recorded: Mon via its task (subject through the task), Wed 23:30 IST via subject directly
      await session(sub, { startedAt: '2026-10-12T04:00:00Z', activeSeconds: 3600, taskId: doneTask });
      await session(sub, { startedAt: '2026-10-14T18:00:00Z', activeSeconds: 1800, subjectNodeId: subjB });
      // never counted: discarded, outside the week (Mon 10-19 00:10 IST is outside)
      await session(sub, { startedAt: '2026-10-12T05:00:00Z', activeSeconds: 6000, status: 'discarded' });
      await session(sub, { startedAt: '2026-10-18T18:40:00Z', activeSeconds: 6000 });
    });

    it('per-day, totals and per-subject; skipped counts in tasksTotal only and never as recorded', async () => {
      const r = await call('get', '/planner/progress?week=2026-10-15', sub);
      expect(r.status).toBe(200);
      expect(r.body.weekStart).toBe('2026-10-12');
      expect(r.body.days).toHaveLength(7);
      expect(r.body.days.map((d: { date: string }) => d.date)).toEqual([
        '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
      ]);
      expect(r.body.days[0]).toEqual({ date: '2026-10-12', recordedMin: 60, plannedMin: 90, tasksDone: 1, tasksTotal: 2 });
      expect(r.body.days[1]).toEqual({ date: '2026-10-13', recordedMin: 0, plannedMin: 0, tasksDone: 0, tasksTotal: 0 });
      expect(r.body.days[2]).toEqual({ date: '2026-10-14', recordedMin: 30, plannedMin: 0, tasksDone: 0, tasksTotal: 1 });
      expect(r.body.totals).toEqual({ recordedMin: 90, plannedMin: 90, goalMin: 600, tasksDone: 1, tasksTotal: 3 });
      expect(r.body.subjects).toEqual([
        { subjectNodeId: subjB, title: 'Economy', plannedMin: 30, recordedMin: 30, targetMin: null },
        { subjectNodeId: subjA, title: 'Polity', plannedMin: 60, recordedMin: 60, targetMin: 300 },
      ]);
    });

    it('week defaults to the current week and honours weekStart sunday', async () => {
      const cur = await call('get', '/planner/progress', sub);
      expect(cur.status).toBe(200);
      expect(cur.body.days).toHaveLength(7);
      await db.insert(studyPreferences).values({ userId: await uid(sub), weekStart: 'sunday' });
      const r = await call('get', '/planner/progress?week=2026-10-15', sub);
      expect(r.body.weekStart).toBe('2026-10-11');
      expect(r.body.days[0].date).toBe('2026-10-11');
      // the 00:10 IST Mon 10-19 session lands in the week starting Sun 10-18
      const next = await call('get', '/planner/progress?week=2026-10-18', sub);
      expect(next.body.weekStart).toBe('2026-10-18');
      expect(next.body.days[1]).toMatchObject({ date: '2026-10-19', recordedMin: 100 });
    });

    it('rejects a malformed week', async () => {
      const r = await call('get', '/planner/progress?week=tomorrow', sub);
      expect([r.status, r.body.error.code]).toEqual([400, 'validation_failed']);
    });

    it("user B sees none of user A's goals or progress", async () => {
      const g = await call('get', '/planner/goals', 'u-prog-b');
      expect(g.body.goals.subjectTargets).toEqual([]);
      expect(g.body.goals.dailyMin).toBe(240);
      const r = await call('get', '/planner/progress?week=2026-10-15', 'u-prog-b');
      expect(r.body.totals).toEqual({ recordedMin: 0, plannedMin: 0, goalMin: 1680, tasksDone: 0, tasksTotal: 0 });
      expect(r.body.subjects).toEqual([]);
      await call('put', '/planner/goals', 'u-prog-b', { dailyMin: 10, weeklyMin: 20 });
      expect((await call('get', '/planner/goals', sub)).body.goals).toMatchObject({ dailyMin: 120, weeklyMin: 600 });
    });
  });

  it('exam dates: any authed user gets them ordered by date', async () => {
    await db.insert(examDates).values([
      { id: newId(), exam: 'mains', year: 2027, date: '2027-08-20', status: 'illustrative' },
      { id: newId(), exam: 'prelims', year: 2027, date: '2027-05-23', status: 'confirmed' },
    ]);
    const r = await call('get', '/planner/exam-dates', 'u-exam');
    expect(r.status).toBe(200);
    expect(r.body.examDates).toEqual([
      expect.objectContaining({ exam: 'prelims', year: 2027, date: '2027-05-23', status: 'confirmed' }),
      expect.objectContaining({ exam: 'mains', year: 2027, date: '2027-08-20', status: 'illustrative' }),
    ]);
  });
});
