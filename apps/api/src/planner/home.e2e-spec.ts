import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import { dayRange, localDateOf } from '../common/dates';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { examDates, preparationProfiles, studySessions, users } from '../db/schema';

jest.setTimeout(30000);

const IST = 'Asia/Kolkata';
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

describe('GET /home', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;
  const today = () => localDateOf(new Date(), IST);

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
  });
  afterAll(() => close());

  const call = async (method: 'get' | 'post', path: string, sub?: string, body?: object) => {
    let r = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (sub) r = r.set('Authorization', `Bearer ${await signTestToken({ sub, email: `${sub}@example.com` })}`);
    return body ? r.send(body) : r;
  };
  const home = async (sub: string) => {
    const r = await call('get', '/home', sub);
    expect(r.status).toBe(200);
    return r.body;
  };
  const uid = async (sub: string) => (await db.select().from(users).where(eq(users.authSubject, sub)))[0].id;
  /** An ended session on local date `date`, at 01:00 local, of `minutes` active minutes. */
  const sessionOn = async (sub: string, date: string, minutes: number) => {
    const startedAt = new Date(dayRange(date, IST).start.getTime() + 3600_000);
    await db.insert(studySessions).values({
      id: newId(), userId: await uid(sub), plannedMin: 25, startedAt, endedAt: startedAt, activeSeconds: minutes * 60, status: 'ended',
    });
  };
  const taskAt = async (sub: string, title: string, hourOffset: number, durationMin = 30) => {
    const at = new Date(dayRange(today(), IST).start.getTime() + hourOffset * 3600_000).toISOString();
    const r = await call('post', '/planner/tasks', sub, { title, durationMin, scheduledStart: at });
    expect(r.status).toBe(201);
    return r.body.task.id as string;
  };

  it('401 when unauthenticated', async () => {
    expect((await call('get', '/home')).status).toBe(401);
  });

  it('brand-new user: not_started, empty plan, zero week, no countdown, empty practice', async () => {
    const h = await home('u-home-new');
    expect(h).toEqual({
      onboarding: { status: 'not_started', step: 0 },
      countdown: expect.any(Array),
      plan: { done: 0, total: 0, tasks: [] },
      week: { recordedMin: 0, goalMin: 1680, tasksDone: 0, tasksTotal: 0, streakDays: 0 },
      practice: { recentSessions: [], mistakesCount: 0, bookmarksCount: 0 },
    });
    expect(h.countdown).toEqual([]);
  });

  it('onboarding reflects the stored profile', async () => {
    await home('u-home-onb');
    await db.insert(preparationProfiles).values({ userId: await uid('u-home-onb'), onboardingStatus: 'in_progress', onboardingStep: 2 });
    expect((await home('u-home-onb')).onboarding).toEqual({ status: 'in_progress', step: 2 });
  });

  it("plan shows today's top 3 open tasks; done and total count today's tasks", async () => {
    const sub = 'u-home-plan';
    const a = await taskAt(sub, 'done one', 2);
    const b = await taskAt(sub, 'skipped one', 3);
    const open = [await taskAt(sub, 'open 1', 4), await taskAt(sub, 'open 2', 5), await taskAt(sub, 'open 3', 6), await taskAt(sub, 'open 4', 7)];
    await call('post', `/planner/tasks/${a}/complete`, sub, {});
    await call('post', `/planner/tasks/${b}/skip`, sub);
    const h = await home(sub);
    expect(h.plan.done).toBe(1);
    expect(h.plan.total).toBe(6);
    expect(h.plan.tasks.map((t: { id: string }) => t.id)).toEqual(open.slice(0, 3));
    expect(h.plan.tasks[0]).toMatchObject({ title: 'open 1', status: 'todo' });
    // the week block counts the same tasks
    expect(h.week).toMatchObject({ tasksDone: 1, tasksTotal: 6 });
  });

  it('week recorded minutes count only ended sessions today', async () => {
    const sub = 'u-home-week';
    await call('get', '/home', sub);
    await sessionOn(sub, today(), 30);
    await db.insert(studySessions).values({
      id: newId(), userId: await uid(sub), plannedMin: 25, startedAt: new Date(), activeSeconds: 6000, status: 'discarded',
    });
    expect((await home(sub)).week).toMatchObject({ recordedMin: 30, goalMin: 1680, streakDays: 1 });
  });

  it('streak: consecutive days with at least 10 recorded minutes, ending today or yesterday', async () => {
    const sub = 'u-home-streak';
    await call('get', '/home', sub);
    const t = today();
    for (const back of [1, 2, 3, 5]) await sessionOn(sub, addDays(t, -back), 10); // gap at -4
    await sessionOn(sub, addDays(t, -4), 9); // below the threshold: still a gap
    expect((await home(sub)).week.streakDays).toBe(3); // today empty, counts back from yesterday
    await sessionOn(sub, t, 9);
    expect((await home(sub)).week.streakDays).toBe(3); // today has < 10 min: still from yesterday
    await sessionOn(sub, t, 1);
    expect((await home(sub)).week.streakDays).toBe(4);
  });

  it('streak is 0 when neither today nor yesterday qualifies', async () => {
    const sub = 'u-home-stale';
    await call('get', '/home', sub);
    await sessionOn(sub, addDays(today(), -2), 60);
    expect((await home(sub)).week.streakDays).toBe(0);
  });

  it("countdown: daysLeft from the user's local date, illustrative flag, past exams hidden", async () => {
    const sub = 'u-home-count';
    const t = today();
    await db.insert(examDates).values([
      { id: newId(), exam: 'prelims', year: 2020, date: addDays(t, -30), status: 'confirmed' },
      { id: newId(), exam: 'mains', year: 2099, date: addDays(t, 100), status: 'confirmed' },
      { id: newId(), exam: 'prelims', year: 2098, date: addDays(t, 10), status: 'illustrative' },
    ]);
    const h = await home(sub);
    expect(h.countdown).toEqual([
      { exam: 'prelims', year: 2098, date: addDays(t, 10), daysLeft: 10, illustrative: true },
      { exam: 'mains', year: 2099, date: addDays(t, 100), daysLeft: 100, illustrative: false },
    ]);
  });

  it("isolation: user B's home shows nothing of user A's tasks or sessions", async () => {
    const a = 'u-home-iso-a';
    await taskAt(a, 'A secret', 4);
    await sessionOn(a, today(), 45);
    const b = await home('u-home-iso-b');
    expect(b.plan).toEqual({ done: 0, total: 0, tasks: [] });
    expect(b.week).toMatchObject({ recordedMin: 0, tasksTotal: 0, streakDays: 0 });
    expect((await home(a)).week.recordedMin).toBe(45);
  });
});
