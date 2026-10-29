import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { syllabusNodes } from '../db/schema';

jest.setTimeout(30000);

describe('planner tasks', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
  });
  afterAll(() => close());

  const call = async (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, sub?: string, body?: object) => {
    let r = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (sub) r = r.set('Authorization', `Bearer ${await signTestToken({ sub, email: `${sub}@example.com` })}`);
    return body ? r.send(body) : r;
  };
  const mk = async (sub: string, body: object) => {
    const r = await call('post', '/planner/tasks', sub, body);
    expect(r.status).toBe(201);
    return r.body.task as { id: string; status: string; scheduledStart: string | null };
  };
  const ids = (r: { body: { tasks: { id: string }[] } }) => r.body.tasks.map((t) => t.id);

  it('401 when unauthenticated', async () => {
    expect((await call('get', '/planner/today')).status).toBe(401);
    expect((await call('post', '/planner/tasks', undefined, { title: 'x' })).status).toBe(401);
  });

  it('title-only task is unscheduled, not in today; rescheduling removes it from the backlog', async () => {
    const t = await mk('u-backlog', { title: 'Read Laxmikanth' });
    expect(t).toMatchObject({ status: 'todo', scheduledStart: null });
    expect(ids(await call('get', '/planner/unscheduled', 'u-backlog'))).toEqual([t.id]);
    const today = await call('get', '/planner/today?date=2026-10-14', 'u-backlog');
    expect(today.body.tasks).toEqual([]);
    expect(today.body.unscheduledCount).toBe(1);

    const r = await call('post', `/planner/tasks/${t.id}/reschedule`, 'u-backlog', { scheduledStart: '2026-10-14T05:00:00Z' });
    expect(r.status).toBe(200);
    expect(r.body.task.scheduledStart).toBe('2026-10-14T05:00:00.000Z');
    expect(ids(await call('get', '/planner/unscheduled', 'u-backlog'))).toEqual([]);
    expect(ids(await call('get', '/planner/today?date=2026-10-14', 'u-backlog'))).toEqual([t.id]);

    const back = await call('post', `/planner/tasks/${t.id}/reschedule`, 'u-backlog', { scheduledStart: null });
    expect(back.body.task.scheduledStart).toBeNull();
    expect(ids(await call('get', '/planner/unscheduled', 'u-backlog'))).toEqual([t.id]);
  });

  it('IST day boundaries: 23:30 IST on the 14th vs 00:10 IST on the 15th', async () => {
    const late = await mk('u-ist', { title: 'late', scheduledStart: '2026-10-14T18:00:00Z' }); // 23:30 IST 14th
    const early = await mk('u-ist', { title: 'early', scheduledStart: '2026-10-14T18:40:00Z' }); // 00:10 IST 15th
    expect(ids(await call('get', '/planner/today?date=2026-10-14', 'u-ist'))).toEqual([late.id]);
    expect(ids(await call('get', '/planner/today?date=2026-10-15', 'u-ist'))).toEqual([early.id]);
    const range = await call('get', '/planner/range?from=2026-10-14&to=2026-10-14', 'u-ist');
    expect(ids(range)).toEqual([late.id]);
    const both = await call('get', '/planner/range?from=2026-10-14&to=2026-10-15', 'u-ist');
    expect(ids(both)).toEqual([late.id, early.id]);
  });

  it('overdue lists yesterday open tasks, not completed ones', async () => {
    const open = await mk('u-over', { title: 'open', scheduledStart: '2026-10-13T05:00:00Z' });
    const done = await mk('u-over', { title: 'done', scheduledStart: '2026-10-13T06:00:00Z' });
    await call('post', `/planner/tasks/${done.id}/complete`, 'u-over', {});
    const today = await call('get', '/planner/today?date=2026-10-14', 'u-over');
    expect(today.body.overdue.map((t: { id: string }) => t.id)).toEqual([open.id]);
    expect(today.body.tasks).toEqual([]);
  });

  it('complete stores actualMin and completedAt; skip sets skipped; stats count them', async () => {
    const a = await mk('u-act', { title: 'a', scheduledStart: '2026-10-14T05:00:00Z', durationMin: 60 });
    const b = await mk('u-act', { title: 'b', scheduledStart: '2026-10-14T06:00:00Z', durationMin: 30 });
    const c = await call('post', `/planner/tasks/${a.id}/complete`, 'u-act', { actualMin: 55 });
    expect(c.status).toBe(200);
    expect(c.body.task).toMatchObject({ status: 'completed', actualMin: 55 });
    expect(typeof c.body.task.completedAt).toBe('string');
    const s = await call('post', `/planner/tasks/${b.id}/skip`, 'u-act');
    expect(s.body.task.status).toBe('skipped');
    const today = await call('get', '/planner/today?date=2026-10-14', 'u-act');
    expect(today.body.stats).toEqual({ plannedMin: 60, recordedMin: 0, completed: 1, total: 2 });
  });

  it('completed or skipped unscheduled tasks leave the backlog', async () => {
    const open = await mk('u-backlog2', { title: 'open' });
    const done = await mk('u-backlog2', { title: 'done' });
    const skipped = await mk('u-backlog2', { title: 'skipped' });
    await call('post', `/planner/tasks/${done.id}/complete`, 'u-backlog2', {});
    await call('post', `/planner/tasks/${skipped.id}/skip`, 'u-backlog2');
    expect(ids(await call('get', '/planner/unscheduled', 'u-backlog2'))).toEqual([open.id]);
    expect((await call('get', '/planner/today?date=2026-10-14', 'u-backlog2')).body.unscheduledCount).toBe(1);
  });

  it('completing an already-completed task keeps completedAt and actualMin', async () => {
    const t = await mk('u-idem', { title: 'once', scheduledStart: '2026-10-14T05:00:00Z' });
    const first = await call('post', `/planner/tasks/${t.id}/complete`, 'u-idem', { actualMin: 30 });
    expect(first.body.task).toMatchObject({ status: 'completed', actualMin: 30 });
    const again = await call('post', `/planner/tasks/${t.id}/complete`, 'u-idem', { actualMin: 99 });
    expect(again.status).toBe(200);
    expect(again.body.task).toMatchObject({ status: 'completed', actualMin: 30, completedAt: first.body.task.completedAt });
  });

  it('DELETE hides everywhere; second DELETE is 404', async () => {
    const t = await mk('u-del', { title: 'gone', scheduledStart: '2026-10-14T05:00:00Z' });
    const u = await mk('u-del', { title: 'gone2' });
    expect((await call('delete', `/planner/tasks/${t.id}`, 'u-del')).status).toBe(204);
    expect((await call('delete', `/planner/tasks/${u.id}`, 'u-del')).status).toBe(204);
    expect((await call('delete', `/planner/tasks/${t.id}`, 'u-del')).status).toBe(404);
    expect((await call('get', `/planner/tasks/${t.id}`, 'u-del')).status).toBe(404);
    expect(ids(await call('get', '/planner/today?date=2026-10-14', 'u-del'))).toEqual([]);
    expect(ids(await call('get', '/planner/range?from=2026-10-01&to=2026-10-31', 'u-del'))).toEqual([]);
    expect(ids(await call('get', '/planner/unscheduled', 'u-del'))).toEqual([]);
    expect((await call('get', '/planner/today?date=2026-10-14', 'u-del')).body.unscheduledCount).toBe(0);
  });

  it('validates input', async () => {
    const range = await call('get', '/planner/range?from=2026-01-01&to=2026-03-01', 'u-val');
    expect(range.status).toBe(400);
    expect(range.body.error.code).toBe('validation_failed');
    expect((await call('get', '/planner/range?from=2026-01-01&to=2026-02-11', 'u-val')).status).toBe(200); // 42 days
    expect((await call('get', '/planner/range?from=2026-01-01&to=2026-02-12', 'u-val')).status).toBe(400); // 43 days
    expect((await call('get', '/planner/range?from=2026-02-01&to=2026-01-01', 'u-val')).status).toBe(400);
    expect((await call('get', '/planner/today?date=nope', 'u-val')).status).toBe(400);
    const empty = await call('post', '/planner/tasks', 'u-val', { title: '' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('validation_failed');
    expect((await call('post', '/planner/tasks', 'u-val', { title: 'x', durationMin: 2 })).status).toBe(400);
    expect((await call('post', '/planner/tasks', 'u-val', { title: 'x', scheduledStart: 'tomorrow' })).status).toBe(400);
    expect((await call('post', '/planner/tasks', 'u-val', { title: 'x', subjectNodeId: newId() })).status).toBe(400);
    expect((await call('get', '/planner/tasks/not-a-uuid', 'u-val')).status).toBe(404);
  });

  it('subject title is returned, and PATCH updates fields', async () => {
    const nodeId = newId();
    await db.insert(syllabusNodes).values({
      id: nodeId, parentId: null, path: 'polity', level: 0, examStage: 'prelims', paper: 'GS2',
      title: 'Polity', slug: 'polity-planner', order: 0, status: 'published',
    });
    const t = await mk('u-patch', { title: 'orig', subjectNodeId: nodeId, activityType: 'reading', priority: 'high' });
    const got = await call('get', `/planner/tasks/${t.id}`, 'u-patch');
    expect(got.body.task).toMatchObject({ subjectNodeId: nodeId, subjectTitle: 'Polity', activityType: 'reading', priority: 'high' });
    const p = await call('patch', `/planner/tasks/${t.id}`, 'u-patch', { title: 'new', notes: 'n', subjectNodeId: null });
    expect(p.status).toBe(200);
    expect(p.body.task).toMatchObject({ title: 'new', notes: 'n', subjectNodeId: null, subjectTitle: null });
  });

  it('user B cannot see or change user A tasks (404)', async () => {
    const t = await mk('u-a', { title: 'mine', scheduledStart: '2026-10-14T05:00:00Z' });
    expect((await call('get', `/planner/tasks/${t.id}`, 'u-b')).status).toBe(404);
    expect((await call('patch', `/planner/tasks/${t.id}`, 'u-b', { title: 'hax' })).status).toBe(404);
    expect((await call('post', `/planner/tasks/${t.id}/complete`, 'u-b', {})).status).toBe(404);
    expect((await call('post', `/planner/tasks/${t.id}/skip`, 'u-b')).status).toBe(404);
    expect((await call('post', `/planner/tasks/${t.id}/reschedule`, 'u-b', { scheduledStart: null })).status).toBe(404);
    expect((await call('delete', `/planner/tasks/${t.id}`, 'u-b')).status).toBe(404);
    expect(ids(await call('get', '/planner/today?date=2026-10-14', 'u-b'))).toEqual([]);
    const still = await call('get', `/planner/tasks/${t.id}`, 'u-a');
    expect(still.body.task).toMatchObject({ title: 'mine', status: 'todo' });
  });

  it('overloaded when planned minutes exceed 125% of the daily goal or 720', async () => {
    await call('put', '/me/study-preferences', 'u-load', { dailyGoalMin: 240 });
    await mk('u-load', { title: 'big', scheduledStart: '2026-10-14T05:00:00Z', durationMin: 300 });
    expect((await call('get', '/planner/today?date=2026-10-14', 'u-load')).body.overloaded).toBe(false); // 300 == 1.25x
    await mk('u-load', { title: 'more', scheduledStart: '2026-10-14T07:00:00Z', durationMin: 100 });
    const today = await call('get', '/planner/today?date=2026-10-14', 'u-load');
    expect(today.body.stats.plannedMin).toBe(400);
    expect(today.body.overloaded).toBe(true);

    await call('put', '/me/study-preferences', 'u-big', { dailyGoalMin: 960 });
    await mk('u-big', { title: 'a', scheduledStart: '2026-10-14T05:00:00Z', durationMin: 720 });
    await mk('u-big', { title: 'b', scheduledStart: '2026-10-14T07:00:00Z', durationMin: 5 });
    expect((await call('get', '/planner/today?date=2026-10-14', 'u-big')).body.overloaded).toBe(true);
  });
});
