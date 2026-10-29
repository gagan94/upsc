import { INestApplication } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { entitlementOverrides, featureCatalog, planEntitlements, plans, users } from '../db/schema';
import { HEARTBEAT_MAX_CREDIT_S, StudySessionsService } from './study-sessions.service';

jest.setTimeout(30000);

interface Session {
  id: string;
  status: string;
  plannedMin: number;
  startedAt: string;
  activeSeconds: number;
  pausedSeconds: number;
  idleSeconds: number;
  taskId: string | null;
  subjectNodeId: string | null;
  stale: boolean;
  endedAt: string | null;
  endReason: string | null;
  focusRating: number | null;
  notes: string | null;
}

describe('study sessions', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
    const freeId = newId();
    await db.insert(featureCatalog).values({ key: 'study.session', name: 'Study sessions', type: 'boolean', defaultPeriod: 'none' });
    await db.insert(plans).values({ id: freeId, key: 'free', name: 'Free', isDefault: true, status: 'active' });
    await db.insert(planEntitlements).values({
      planId: freeId, featureKey: 'study.session', enabled: true, limitValue: null, period: 'none',
    });
  });
  afterAll(() => close());

  const call = async (method: 'get' | 'post', path: string, sub?: string, body?: object) => {
    let r = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (sub) r = r.set('Authorization', `Bearer ${await signTestToken({ sub, email: `${sub}@example.com` })}`);
    return body ? r.send(body) : r;
  };
  const start = async (sub: string, body: object = { plannedMin: 25 }): Promise<Session> => {
    const r = await call('post', '/study-sessions', sub, body);
    expect(r.status).toBe(201);
    return r.body.session;
  };
  const beat = async (sub: string, id: string, interacted = true): Promise<Session> => {
    const r = await call('post', `/study-sessions/${id}/heartbeat`, sub, { interacted });
    expect(r.status).toBe(200);
    return r.body.session;
  };
  /** Simulate elapsed time: move the last heartbeat `seconds` into the past (DB clock). */
  const backdate = (id: string, seconds: number) =>
    db.execute(sql`update planner.study_sessions
      set last_heartbeat_at = now() - make_interval(secs => ${seconds}) where id = ${id}::uuid`);
  const userId = async (sub: string) => (await db.select().from(users).where(eq(users.authSubject, sub)))[0].id;

  it('401 when unauthenticated', async () => {
    expect((await call('post', '/study-sessions', undefined, { plannedMin: 25 })).status).toBe(401);
    expect((await call('get', '/study-sessions/active')).status).toBe(401);
  });

  it('two concurrent starts: exactly one 201 and one 409 session_conflict', async () => {
    const [a, b] = await Promise.all([
      call('post', '/study-sessions', 'u-race', { plannedMin: 25 }),
      call('post', '/study-sessions', 'u-race', { plannedMin: 30 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const ok = a.status === 201 ? a : b;
    const conflict = a.status === 201 ? b : a;
    expect(conflict.body.error.code).toBe('session_conflict');
    expect(conflict.body.error.active.id).toBe(ok.body.session.id);
    expect(ok.body.session).toMatchObject({ status: 'running', activeSeconds: 0, pausedSeconds: 0, stale: false });
    const active = await call('get', '/study-sessions/active', 'u-race');
    expect(active.body.session.id).toBe(ok.body.session.id);
  });

  it('a paused session still blocks a new start; a new one may start after ending', async () => {
    const s = await start('u-block');
    expect((await call('post', `/study-sessions/${s.id}/pause`, 'u-block')).body.session.status).toBe('paused');
    const r = await call('post', '/study-sessions', 'u-block', { plannedMin: 25 });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('session_conflict');
    expect((await call('post', `/study-sessions/${s.id}/end`, 'u-block', {})).status).toBe(200);
    await start('u-block');
  });

  it('idle heartbeats add no active time', async () => {
    const s = await start('u-idle');
    await backdate(s.id, 30);
    const after = await beat('u-idle', s.id, false);
    expect(after.activeSeconds).toBe(0);
    expect(after.idleSeconds).toBeGreaterThanOrEqual(30);
    expect(after.idleSeconds).toBeLessThanOrEqual(31);
  });

  it('25-minute plan with 20 minutes of interacted heartbeats records 20 minutes', async () => {
    const s = await start('u-twenty', { plannedMin: 25 });
    for (let i = 0; i < 20; i++) {
      await backdate(s.id, 60);
      await beat('u-twenty', s.id);
    }
    const end = await call('post', `/study-sessions/${s.id}/end`, 'u-twenty', { focusRating: 4, notes: 'ok' });
    expect(end.status).toBe(200);
    expect(end.body.session).toMatchObject({ status: 'ended', endReason: 'user', focusRating: 4, notes: 'ok' });
    expect(end.body.session.activeSeconds).toBeGreaterThanOrEqual(1200);
    expect(end.body.session.activeSeconds).toBeLessThanOrEqual(1210);
    const svc = app.get(StudySessionsService);
    const uid = await userId('u-twenty');
    const startedAt = new Date(s.startedAt);
    const minutes = await svc.recordedMinutes(uid, new Date(startedAt.getTime() - 1000), new Date(startedAt.getTime() + 86400000));
    expect(minutes).toBe(20);
  });

  it('target_reached when active time meets the plan', async () => {
    const s = await start('u-target', { plannedMin: 5 });
    for (let i = 0; i < 5; i++) {
      await backdate(s.id, 60);
      await beat('u-target', s.id);
    }
    const end = await call('post', `/study-sessions/${s.id}/end`, 'u-target', {});
    expect(end.body.session.endReason).toBe('target_reached');
  });

  it('credit per heartbeat is capped (a 9-minute gap credits 60 s)', async () => {
    const s = await start('u-cap');
    await backdate(s.id, 9 * 60);
    const after = await beat('u-cap', s.id);
    expect(after.activeSeconds).toBe(HEARTBEAT_MAX_CREDIT_S);
    expect(HEARTBEAT_MAX_CREDIT_S).toBe(60);
  });

  const rowOf = async (id: string) =>
    ((await db.execute(sql`select status, active_seconds, idle_seconds, paused_seconds, last_heartbeat_at
      from planner.study_sessions where id = ${id}::uuid`)).rows as Record<string, unknown>[])[0];

  it('a heartbeat on a stale session is 409 session_stale and changes nothing; recover resume then works', async () => {
    const s = await start('u-hbstale');
    await backdate(s.id, 11 * 60);
    const before = await rowOf(s.id);
    const r = await call('post', `/study-sessions/${s.id}/heartbeat`, 'u-hbstale', { interacted: true });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('session_stale');
    expect(await rowOf(s.id)).toEqual(before);
    const active = await call('get', '/study-sessions/active', 'u-hbstale');
    expect(active.body.session).toMatchObject({ id: s.id, stale: true, activeSeconds: 0 });
    const rec = await call('post', `/study-sessions/${s.id}/recover`, 'u-hbstale', { action: 'resume' });
    expect(rec.status).toBe(200);
    expect(rec.body.session).toMatchObject({ status: 'running', stale: false, activeSeconds: 0 });
    await backdate(s.id, 30);
    const after = await beat('u-hbstale', s.id);
    expect(after.activeSeconds).toBeGreaterThanOrEqual(30);
    expect(after.activeSeconds).toBeLessThanOrEqual(31);
  });

  it('a heartbeat on a stale paused session is also 409 session_stale', async () => {
    const s = await start('u-pstale');
    await call('post', `/study-sessions/${s.id}/pause`, 'u-pstale');
    await backdate(s.id, 11 * 60);
    const before = await rowOf(s.id);
    const r = await call('post', `/study-sessions/${s.id}/heartbeat`, 'u-pstale', { interacted: false });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('session_stale');
    expect(await rowOf(s.id)).toEqual(before);
    expect((await call('get', '/study-sessions/active', 'u-pstale')).body.session).toMatchObject({ status: 'paused', stale: true });
  });

  it('plain end on a stale session ends at the last heartbeat without crediting the gap', async () => {
    const s = await start('u-endstale');
    await backdate(s.id, 30);
    await beat('u-endstale', s.id);
    await backdate(s.id, 11 * 60);
    const { last_heartbeat_at: lhb, active_seconds: secs } = await rowOf(s.id);
    const r = await call('post', `/study-sessions/${s.id}/end`, 'u-endstale', {});
    expect(r.status).toBe(200);
    expect(r.body.session).toMatchObject({ status: 'ended', endReason: 'user', activeSeconds: secs, stale: false });
    expect(r.body.session.endedAt).toBe(new Date(lhb as string).toISOString());
  });

  it('plain end on a fresh session ends now', async () => {
    const s = await start('u-endfresh');
    await backdate(s.id, 30);
    const r = await call('post', `/study-sessions/${s.id}/end`, 'u-endfresh', {});
    expect(Math.abs(Date.parse(r.body.session.endedAt) - Date.now())).toBeLessThan(10000);
  });

  it('concurrent heartbeats do not double-credit the same interval', async () => {
    const s = await start('u-dbl');
    await backdate(s.id, 60);
    await Promise.all([beat('u-dbl', s.id), beat('u-dbl', s.id), beat('u-dbl', s.id)]);
    const active = await call('get', '/study-sessions/active', 'u-dbl');
    expect(active.body.session.activeSeconds).toBeGreaterThanOrEqual(60);
    expect(active.body.session.activeSeconds).toBeLessThanOrEqual(61);
  });

  it('pause stops crediting; resume credits again', async () => {
    const s = await start('u-pause');
    const p = await call('post', `/study-sessions/${s.id}/pause`, 'u-pause');
    expect(p.status).toBe(200);
    expect(p.body.session.status).toBe('paused');
    await backdate(s.id, 60);
    const paused = await beat('u-pause', s.id);
    expect(paused.activeSeconds).toBe(0);
    expect(paused.pausedSeconds).toBeGreaterThanOrEqual(60);
    expect((await call('post', `/study-sessions/${s.id}/pause`, 'u-pause')).status).toBe(409);
    const r = await call('post', `/study-sessions/${s.id}/resume`, 'u-pause');
    expect(r.body.session.status).toBe('running');
    await backdate(s.id, 60);
    expect((await beat('u-pause', s.id)).activeSeconds).toBeGreaterThanOrEqual(60);
    expect((await call('post', `/study-sessions/${s.id}/resume`, 'u-pause')).status).toBe(409);
  });

  it('stale after 10 minutes without a heartbeat; recover end ends at the last heartbeat', async () => {
    const s = await start('u-stale');
    await backdate(s.id, 60);
    await beat('u-stale', s.id);
    const early = await call('post', `/study-sessions/${s.id}/recover`, 'u-stale', { action: 'end' });
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('invalid_state');
    await backdate(s.id, 11 * 60);
    const active = await call('get', '/study-sessions/active', 'u-stale');
    expect(active.body.session).toMatchObject({ id: s.id, stale: true });
    const [row] = (await db.execute(
      sql`select last_heartbeat_at from planner.study_sessions where id = ${s.id}::uuid`,
    )).rows as { last_heartbeat_at: Date | string }[];
    const r = await call('post', `/study-sessions/${s.id}/recover`, 'u-stale', { action: 'end' });
    expect(r.status).toBe(200);
    expect(r.body.session).toMatchObject({ status: 'ended', endReason: 'recovered', stale: false });
    expect(r.body.session.endedAt).toBe(new Date(row.last_heartbeat_at).toISOString());
    expect(r.body.session.activeSeconds).toBeLessThanOrEqual(61);
    expect((await call('get', '/study-sessions/active', 'u-stale')).body.session).toBeNull();
  });

  it('recover resume and discard', async () => {
    const s = await start('u-rec');
    await backdate(s.id, 11 * 60);
    const r = await call('post', `/study-sessions/${s.id}/recover`, 'u-rec', { action: 'resume' });
    expect(r.body.session).toMatchObject({ status: 'running', stale: false, activeSeconds: 0 });
    await backdate(s.id, 11 * 60);
    const d = await call('post', `/study-sessions/${s.id}/recover`, 'u-rec', { action: 'discard' });
    expect(d.body.session).toMatchObject({ status: 'discarded', endReason: 'discarded' });
    expect((await call('post', `/study-sessions/${s.id}/recover`, 'u-rec', { action: 'nope' })).status).toBe(400);
  });

  it('end with completeTask completes the linked task with actualMin', async () => {
    const t = await call('post', '/planner/tasks', 'u-task', { title: 'Read polity', durationMin: 30 });
    const s = await start('u-task', { plannedMin: 30, taskId: t.body.task.id });
    expect(s.taskId).toBe(t.body.task.id);
    for (let i = 0; i < 3; i++) {
      await backdate(s.id, 60);
      await beat('u-task', s.id);
    }
    const end = await call('post', `/study-sessions/${s.id}/end`, 'u-task', { completeTask: true });
    expect(end.status).toBe(200);
    const task = await call('get', `/planner/tasks/${t.body.task.id}`, 'u-task');
    expect(task.body.task).toMatchObject({ status: 'completed', actualMin: 3 });
  });

  it('ending twice is 409 invalid_state; heartbeats after end are rejected', async () => {
    const s = await start('u-twice');
    expect((await call('post', `/study-sessions/${s.id}/end`, 'u-twice', {})).status).toBe(200);
    const again = await call('post', `/study-sessions/${s.id}/end`, 'u-twice', {});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('invalid_state');
    expect((await call('post', `/study-sessions/${s.id}/heartbeat`, 'u-twice', { interacted: true })).status).toBe(409);
    expect((await call('post', `/study-sessions/${s.id}/discard`, 'u-twice')).status).toBe(409);
  });

  it('validates input', async () => {
    for (const body of [{}, { plannedMin: 4 }, { plannedMin: 241 }, { plannedMin: 25, taskId: 'x' }]) {
      const r = await call('post', '/study-sessions', 'u-val', body);
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe('validation_failed');
    }
    expect((await call('post', '/study-sessions', 'u-val', { plannedMin: 25, taskId: newId() })).status).toBe(400);
    expect((await call('post', '/study-sessions', 'u-val', { plannedMin: 25, subjectNodeId: newId() })).status).toBe(400);
    const s = await start('u-val');
    expect((await call('post', `/study-sessions/${s.id}/heartbeat`, 'u-val', {})).status).toBe(400);
    expect((await call('post', `/study-sessions/${s.id}/end`, 'u-val', { focusRating: 6 })).status).toBe(400);
    expect((await call('post', '/study-sessions/not-a-uuid/pause', 'u-val')).status).toBe(404);
    expect((await call('get', '/study-sessions?limit=0', 'u-val')).status).toBe(400);
    expect((await call('get', '/study-sessions?from=nope', 'u-val')).status).toBe(400);
  });

  it("user B gets 404 on A's session and cannot use A's task", async () => {
    const t = await call('post', '/planner/tasks', 'u-sa', { title: 'A task' });
    const s = await start('u-sa');
    for (const p of ['pause', 'resume', 'end', 'discard']) {
      const r = await call('post', `/study-sessions/${s.id}/${p}`, 'u-sb', {});
      expect(r.status).toBe(404);
      expect(r.body.error.code).toBe('not_found');
    }
    expect((await call('post', `/study-sessions/${s.id}/heartbeat`, 'u-sb', { interacted: true })).status).toBe(404);
    expect((await call('post', `/study-sessions/${s.id}/recover`, 'u-sb', { action: 'end' })).status).toBe(404);
    expect((await call('get', '/study-sessions/active', 'u-sb')).body.session).toBeNull();
    expect((await call('post', '/study-sessions', 'u-sb', { plannedMin: 25, taskId: t.body.task.id })).status).toBe(400);
    expect((await call('get', '/study-sessions/active', 'u-sa')).body.session).toMatchObject({ id: s.id, status: 'running' });
  });

  it('lists ended sessions newest first, filtered by day', async () => {
    const a = await start('u-list');
    await call('post', `/study-sessions/${a.id}/end`, 'u-list', {});
    const b = await start('u-list');
    await call('post', `/study-sessions/${b.id}/discard`, 'u-list');
    const c = await start('u-list');
    await call('post', `/study-sessions/${c.id}/end`, 'u-list', {});
    await start('u-list'); // running: not listed
    await db.execute(sql`update planner.study_sessions set started_at = '2026-10-14T05:00:00Z' where id = ${a.id}::uuid`);
    await db.execute(sql`update planner.study_sessions set started_at = '2026-10-14T18:40:00Z' where id = ${c.id}::uuid`); // 00:10 IST 15th
    const all = await call('get', '/study-sessions', 'u-list');
    expect(all.body.sessions.map((s: Session) => s.id)).toEqual([c.id, a.id]);
    const day = await call('get', '/study-sessions?from=2026-10-14&to=2026-10-14', 'u-list');
    expect(day.body.sessions.map((s: Session) => s.id)).toEqual([a.id]);
    const one = await call('get', '/study-sessions?limit=1', 'u-list');
    expect(one.body.sessions.map((s: Session) => s.id)).toEqual([c.id]);
    expect((await call('get', '/study-sessions', 'u-sb')).body.sessions).toEqual([]);
  });

  it('today.stats.recordedMin sums ended sessions started that day (IST)', async () => {
    const mkEnded = async (seconds: number, startedAt: string, status: 'ended' | 'discarded' = 'ended') => {
      const s = await start('u-today');
      await db.execute(sql`update planner.study_sessions set active_seconds = ${seconds}, started_at = ${startedAt}::timestamptz where id = ${s.id}::uuid`);
      await call('post', `/study-sessions/${s.id}/${status === 'ended' ? 'end' : 'discard'}`, 'u-today', {});
    };
    await mkEnded(1200, '2026-10-14T05:00:00Z');
    await mkEnded(659, '2026-10-14T18:00:00Z'); // 23:30 IST on the 14th
    await mkEnded(3000, '2026-10-14T18:40:00Z'); // 00:10 IST on the 15th
    await mkEnded(3000, '2026-10-14T06:00:00Z', 'discarded');
    const today = await call('get', '/planner/today?date=2026-10-14', 'u-today');
    expect(today.body.stats.recordedMin).toBe(30); // floor(1859 / 60)
    expect((await call('get', '/planner/today?date=2026-10-15', 'u-today')).body.stats.recordedMin).toBe(50);
  });

  it('402 when the plan does not include study.session', async () => {
    await call('get', '/study-sessions/active', 'u-noent'); // provisions the user
    await db.insert(entitlementOverrides).values({
      id: newId(), userId: await userId('u-noent'), featureKey: 'study.session', enabled: false, period: 'none', reason: 'test',
    });
    const r = await call('post', '/study-sessions', 'u-noent', { plannedMin: 25 });
    expect(r.status).toBe(402);
    expect(r.body.error.code).toBe('entitlement_required');
  });
});
