import { INestApplication } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { entitlementOverrides, sessionQuestions, sessions, subjects, syllabusNodes, users } from '../db/schema';
import type { SeedContext } from '../seed/run-seed';
import { seedBilling } from '../seed/seed-billing';
import { QuestionsService } from './questions.service';

jest.setTimeout(60000);

const LEAKY = /correctOption|explanation|optionReasoning|misconception/;
const KEYS = ['A', 'B', 'C', 'D'] as const;

describe('practice sessions', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;
  let qs: QuestionsService;
  let editorId: string;
  let polity: string; // 12 published platform questions
  let history: string; // 2 verified PYQs, 2 unverified PYQs, 1 draft
  let empty: string; // nothing published
  const verifiedPyqs: string[] = [];
  const polityIds: string[] = [];

  const call = async (method: 'get' | 'post' | 'put', path: string, sub?: string, body?: object) => {
    let r = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (sub) r = r.set('Authorization', `Bearer ${await signTestToken({ sub, email: `${sub}@example.com` })}`);
    return body ? r.send(body) : r;
  };
  const cfg = (over: object = {}) => ({ subjectNodeIds: [polity], source: 'platform', count: 10, mode: 'test', timed: true, ...over });
  const create = async (sub: string, over: object = {}) => {
    const r = await call('post', '/practice/sessions', sub, cfg(over));
    expect(r.status).toBe(201);
    return r.body as { session: { id: string; mode: string; endsAt: string | null; remainingSeconds: number | null; total: number }; questions: { ordinal: number; questionId: string }[]; requested: number; got: number };
  };
  const answer = (sub: string, id: string, ordinal: number, body: object) =>
    call('put', `/practice/sessions/${id}/answers/${ordinal}`, sub, body);
  /** The frozen answer key per ordinal, read straight from the database. */
  const keyOf = async (sessionId: string): Promise<Map<number, string>> => {
    const res: unknown = await db.execute(sql`select sq.ordinal, qv.correct_option from practice.session_questions sq
      join practice.question_versions qv on qv.question_id = sq.question_id and qv.version = sq.question_version
      where sq.session_id = ${sessionId}::uuid`);
    const rows = (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as { ordinal: number; correct_option: string }[];
    return new Map(rows.map((r) => [Number(r.ordinal), r.correct_option]));
  };
  const wrong = (k: string) => KEYS.find((x) => x !== k) as string;
  const userId = async (sub: string) => (await db.select().from(users).where(eq(users.authSubject, sub)))[0].id;
  const expire = (id: string) => db.execute(sql`update practice.sessions set ends_at = now() - interval '1 second' where id = ${id}::uuid`);

  const node = async (slug: string, title: string) => {
    const id = newId();
    await db.insert(syllabusNodes).values({ id, path: slug, level: 1, examStage: 'prelims', paper: 'gs1', title, slug, status: 'published' });
    await db.insert(subjects).values({ id: newId(), syllabusNodeId: id, slug: `s-${slug}`, title, gsPaper: 'GS I', status: 'published' });
    return id;
  };
  let n = 0;
  const question = async (subjectNodeId: string, over: object = {}, publish = true) => {
    n += 1;
    const q = await qs.create(editorId, {
      format: 'single',
      stem: `Practice question ${n}?`,
      options: KEYS.map((key) => ({ key, text: `option ${key}` })),
      correctOption: KEYS[n % 4],
      explanation: 'Because of the reason.',
      optionReasoning: { A: 'ra', B: 'rb', C: 'rc', D: 'rd' },
      misconception: { option: 'B', text: 'Looks plausible' },
      difficulty: 'medium',
      subjectNodeId,
      gsPaper: 'GS1',
      sourceType: 'platform',
      ...over,
    });
    if (publish) await qs.publish(q.id);
    return q.id;
  };

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
    await seedBilling(db, {} as SeedContext);
    qs = app.get(QuestionsService);
    await call('get', '/practice/subjects', 'p-editor');
    editorId = await userId('p-editor');
    polity = await node('p-polity', 'Polity');
    history = await node('p-history', 'History');
    empty = await node('p-empty', 'Empty');
    for (let i = 0; i < 12; i++) polityIds.push(await question(polity));
    for (let i = 0; i < 2; i++) {
      const id = await question(history, { sourceType: 'pyq', pyqYear: 2019, pyqPaper: 'GS I' });
      await qs.verify(id, {});
      verifiedPyqs.push(id);
    }
    for (let i = 0; i < 2; i++) await question(history, { sourceType: 'pyq', pyqYear: 2020, pyqPaper: 'GS I' });
    await question(history, {}, false);
  });
  afterAll(() => close());

  it('401 without a token', async () => {
    expect((await call('get', '/practice/subjects')).status).toBe(401);
    expect((await call('post', '/practice/sessions', undefined, cfg())).status).toBe(401);
  });

  it('lists subjects by syllabus node with published and verified-PYQ counts', async () => {
    const r = await call('get', '/practice/subjects', 'p-u1');
    expect(r.status).toBe(200);
    const byId = new Map((r.body.subjects as { id: string }[]).map((s) => [s.id, s]));
    expect(byId.get(polity)).toEqual({ id: polity, title: 'Polity', gsPaper: 'GS I', publishedCount: 12, pyqVerifiedCount: 0 });
    expect(byId.get(history)).toMatchObject({ publishedCount: 4, pyqVerifiedCount: 2 });
    expect(byId.get(empty)).toMatchObject({ publishedCount: 0, pyqVerifiedCount: 0 });
  });

  it('reports availability against the request', async () => {
    let r = await call('get', `/practice/availability?subjects=${polity},${history}&source=mixed&count=20`, 'p-u1');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ requested: 20, available: 14 });
    r = await call('get', `/practice/availability?subjects=${history}&source=pyq&count=10`, 'p-u1');
    expect(r.body).toEqual({ requested: 10, available: 2 });
    r = await call('get', `/practice/availability?subjects=${polity}&source=platform&count=5`, 'p-u1');
    expect(r.body).toEqual({ requested: 5, available: 5 });
    r = await call('get', `/practice/availability?subjects=${polity}&source=nope&count=5`, 'p-u1');
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('validation_failed');
  });

  it('validates the session config', async () => {
    for (const over of [{ count: 4 }, { count: 51 }, { subjectNodeIds: [] }, { subjectNodeIds: Array.from({ length: 11 }, () => newId()) }, { mode: 'exam' }, { source: 'ai' }, { timed: 'yes' }]) {
      const r = await call('post', '/practice/sessions', 'p-u1', cfg(over));
      expect([over, r.status, r.body.error?.code]).toEqual([over, 400, 'validation_failed']);
    }
  });

  it('creates a timed test session: 72 s per question, ends_at fixed by the server', async () => {
    const s = await create('p-u1');
    expect(s.requested).toBe(10);
    expect(s.got).toBe(10);
    expect(s.session).toMatchObject({ mode: 'test', timed: true, status: 'in_progress', total: 10 });
    expect(s.questions.map((q) => q.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(s.questions.map((q) => q.questionId)).size).toBe(10);
    expect(s.session.remainingSeconds).toBeGreaterThan(715);
    expect(s.session.remainingSeconds).toBeLessThanOrEqual(720);
    const [row] = await db.select().from(sessions).where(eq(sessions.id, s.session.id));
    expect((row.endsAt as Date).getTime() - row.startedAt.getTime()).toBe(720_000);
    expect(row.marking).toEqual({ correct: 2, incorrect: -0.66 });
    const sq = await db.select().from(sessionQuestions).where(eq(sessionQuestions.sessionId, s.session.id));
    expect(sq.every((q) => q.questionVersion === 1)).toBe(true);
  });

  it('an untimed session has no end and no remaining time', async () => {
    const s = await create('p-u1', { timed: false });
    expect(s.session.endsAt).toBeNull();
    expect(s.session.remainingSeconds).toBeNull();
  });

  it('a shorter set when fewer are available; 409 no_questions when none are', async () => {
    const s = await create('p-u1', { count: 20 });
    expect([s.requested, s.got, s.session.total, s.questions.length]).toEqual([20, 12, 12, 12]);
    const [row] = await db.select().from(sessions).where(eq(sessions.id, s.session.id));
    expect((row.endsAt as Date).getTime() - row.startedAt.getTime()).toBe(12 * 72_000);
    const none = await call('post', '/practice/sessions', 'p-u1', cfg({ subjectNodeIds: [empty] }));
    expect(none.status).toBe(409);
    expect(none.body.error.code).toBe('no_questions');
  });

  it('PYQ-only includes verified PYQs and excludes unverified ones', async () => {
    const s = await create('p-u1', { subjectNodeIds: [history], source: 'pyq' });
    expect(s.got).toBe(2);
    expect(s.questions.map((q) => q.questionId).sort()).toEqual([...verifiedPyqs].sort());
    const platformOnly = await call('post', '/practice/sessions', 'p-u1', cfg({ subjectNodeIds: [history], source: 'platform' }));
    expect(platformOnly.status).toBe(409); // the only platform question there is a draft
  });

  it('test mode never sends keys, explanations, reasoning or misconceptions before submit', async () => {
    const created = await call('post', '/practice/sessions', 'p-u1', cfg());
    expect(JSON.stringify(created.body)).not.toMatch(LEAKY);
    const id = created.body.session.id;
    const keys = await keyOf(id);
    const put1 = await answer('p-u1', id, 1, { selected: keys.get(1), confidence: 'sure', timeMsDelta: 4000 });
    expect(put1.status).toBe(200);
    expect(put1.body).toEqual({ saved: true });
    const put2 = await answer('p-u1', id, 2, { selected: wrong(keys.get(2) as string), flagged: true });
    expect(JSON.stringify(put2.body)).not.toMatch(LEAKY);
    // Test mode lets an answer change until submit.
    expect((await answer('p-u1', id, 2, { selected: keys.get(2) })).status).toBe(200);
    const got = await call('get', `/practice/sessions/${id}`, 'p-u1');
    expect(got.status).toBe(200);
    expect(JSON.stringify(got.body)).not.toMatch(LEAKY);
    expect(got.body.questions[0]).toEqual({
      ordinal: 1,
      questionId: expect.any(String),
      format: 'single',
      stem: expect.any(String),
      statements: null,
      options: KEYS.map((key) => ({ key, text: `option ${key}` })),
      selected: keys.get(1),
      flagged: false,
      confidence: 'sure',
    });
    expect(got.body.questions[1]).toMatchObject({ selected: keys.get(2), flagged: true });
    const [sq] = await db.select().from(sessionQuestions).where(eq(sessionQuestions.sessionId, id)).orderBy(sessionQuestions.ordinal);
    expect(sq.timeMs).toBe(4000);
    expect(sq.answeredAt).not.toBeNull();
  });

  it('learning mode gives feedback for an answered question only, and locks it', async () => {
    const s = await create('p-u1', { mode: 'learning', count: 5 });
    const id = s.session.id;
    const keys = await keyOf(id);
    const k1 = keys.get(1) as string;
    const r = await answer('p-u1', id, 1, { selected: wrong(k1) });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ saved: true, feedback: { correctOption: k1, correct: false, explanation: 'Because of the reason.' } });
    // flag-only writes on an unanswered question carry no feedback
    const flagOnly = await answer('p-u1', id, 2, { flagged: true });
    expect(flagOnly.body).toEqual({ saved: true });
    const got = await call('get', `/practice/sessions/${id}`, 'p-u1');
    expect(got.body.questions[0].feedback).toEqual({ correctOption: k1, correct: false, explanation: 'Because of the reason.' });
    expect(JSON.stringify(got.body.questions.slice(1))).not.toMatch(LEAKY);
    const again = await answer('p-u1', id, 1, { selected: k1 });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('already_answered');
    const cleared = await answer('p-u1', id, 1, { selected: null });
    expect(cleared.status).toBe(409);
    // a retried identical answer is idempotent; confidence can be added after answering
    const retry = await answer('p-u1', id, 1, { selected: wrong(k1), confidence: 'guess' });
    expect(retry.status).toBe(200);
    expect(retry.body.feedback.correct).toBe(false);
  });

  it('validates answers and ordinals', async () => {
    const s = await create('p-u1', { count: 5 });
    for (const body of [{ selected: 'E' }, { selected: 'a' }, { confidence: 'maybe' }, { flagged: 'yes' }, { timeMsDelta: -1 }, { timeMsDelta: 1.5 }]) {
      const r = await answer('p-u1', s.session.id, 1, body);
      expect([body, r.status, r.body.error?.code]).toEqual([body, 400, 'validation_failed']);
    }
    for (const ord of ['0', '6', 'x', '1.5']) {
      expect((await answer('p-u1', s.session.id, ord as unknown as number, { flagged: true })).status).toBe(404);
    }
  });

  it('remaining time is derived from ends_at on the database clock', async () => {
    const s = await create('p-u1', { count: 5 });
    const id = s.session.id;
    await db.execute(sql`update practice.sessions set ends_at = ends_at - interval '300 seconds' where id = ${id}::uuid`);
    const r = await call('get', `/practice/sessions/${id}`, 'p-u1');
    expect(r.body.session.status).toBe('in_progress');
    expect(r.body.session.remainingSeconds).toBeLessThanOrEqual(60);
    expect(r.body.session.remainingSeconds).toBeGreaterThan(50);
  });

  it('a write after ends_at auto-submits once as expired and returns 409 session_expired', async () => {
    const s = await create('p-u2', { count: 5 });
    const id = s.session.id;
    const keys = await keyOf(id);
    await answer('p-u2', id, 1, { selected: keys.get(1) });
    await expire(id);
    const late = await answer('p-u2', id, 2, { selected: 'A' });
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('session_expired');
    const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
    expect(row.status).toBe('expired');
    expect(row.correctCount).toBe(1);
    const again = await answer('p-u2', id, 2, { flagged: true });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('session_expired');
    const [row2] = await db.select().from(sessions).where(eq(sessions.id, id));
    expect(row2.submittedAt).toEqual(row.submittedAt);
    const sq = await db.select().from(sessionQuestions).where(eq(sessionQuestions.sessionId, id)).orderBy(sessionQuestions.ordinal);
    expect(sq[1].selected).toBeNull();
    const res = await call('get', `/practice/sessions/${id}/results`, 'p-u2');
    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('expired');
    expect(res.body).toMatchObject({ correct: 1, incorrect: 0, skipped: 4, score: 2 });
  });

  it('reading an in-progress session past ends_at submits it first', async () => {
    const s = await create('p-u2', { count: 5 });
    await expire(s.session.id);
    const r = await call('get', `/practice/sessions/${s.session.id}`, 'p-u2');
    expect(r.status).toBe(200);
    expect(r.body.session).toMatchObject({ status: 'expired', remainingSeconds: 0 });
    const s2 = await create('p-u2', { count: 5 });
    await expire(s2.session.id);
    const res = await call('get', `/practice/sessions/${s2.session.id}/results`, 'p-u2');
    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('expired');
  });

  it('results before submit are 409 not_submitted; writes after submit are rejected', async () => {
    const s = await create('p-u2', { count: 5 });
    const r = await call('get', `/practice/sessions/${s.session.id}/results`, 'p-u2');
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('not_submitted');
    expect((await call('post', `/practice/sessions/${s.session.id}/submit`, 'p-u2')).status).toBe(200);
    const late = await answer('p-u2', s.session.id, 1, { selected: 'A' });
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('session_submitted');
  });

  it('scores 3 right + 2 wrong in 10 as 4.68; flagged/unanswered are skipped; submit is idempotent', async () => {
    const s = await create('p-u3', { count: 10 });
    const id = s.session.id;
    const keys = await keyOf(id);
    for (const o of [1, 2, 3]) await answer('p-u3', id, o, { selected: keys.get(o) });
    for (const o of [4, 5]) await answer('p-u3', id, o, { selected: wrong(keys.get(o) as string) });
    await answer('p-u3', id, 6, { flagged: true });
    const [a, b] = await Promise.all([
      call('post', `/practice/sessions/${id}/submit`, 'p-u3'),
      call('post', `/practice/sessions/${id}/submit`, 'p-u3'),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(b.body).toEqual(a.body);
    expect(a.body).toMatchObject({ score: 4.68, accuracy: 0.6, correct: 3, incorrect: 2, skipped: 5 });
    expect(a.body.session).toMatchObject({ mode: 'test', status: 'submitted', total: 10 });
    expect(a.body.session.timeTakenSeconds).toBeGreaterThanOrEqual(0);
    expect(a.body.questions[5]).toMatchObject({ ordinal: 6, selected: null, correct: null, flagged: true, bookmarked: false });
    expect(a.body.questions[0]).toMatchObject({ ordinal: 1, selected: keys.get(1), correctOption: keys.get(1), correct: true });
    const marksBefore = await db.select().from(sessionQuestions).where(eq(sessionQuestions.sessionId, id)).orderBy(sessionQuestions.ordinal);
    expect(marksBefore.map((m) => Number(m.marks))).toEqual([2, 2, 2, -0.66, -0.66, 0, 0, 0, 0, 0]);
    const [before] = await db.select().from(sessions).where(eq(sessions.id, id));
    const c = await call('post', `/practice/sessions/${id}/submit`, 'p-u3');
    expect(c.body).toEqual(a.body);
    expect((await call('get', `/practice/sessions/${id}/results`, 'p-u3')).body).toEqual(a.body);
    const [after] = await db.select().from(sessions).where(eq(sessions.id, id));
    expect(after.submittedAt).toEqual(before.submittedAt);
    expect(await db.select().from(sessionQuestions).where(eq(sessionQuestions.sessionId, id)).orderBy(sessionQuestions.ordinal)).toEqual(marksBefore);
    // after submit, the session view may show the key
    const view = await call('get', `/practice/sessions/${id}`, 'p-u3');
    expect(view.body.session.status).toBe('submitted');
    expect(view.body.questions[0].feedback).toMatchObject({ correctOption: keys.get(1), correct: true });
  });

  it('all skipped scores 0 at accuracy 0; learning mode has no score', async () => {
    const s = await create('p-u3', { count: 5 });
    const r = await call('post', `/practice/sessions/${s.session.id}/submit`, 'p-u3');
    expect(r.body).toMatchObject({ score: 0, accuracy: 0, correct: 0, incorrect: 0, skipped: 5 });
    const l = await create('p-u3', { count: 5, mode: 'learning' });
    const keys = await keyOf(l.session.id);
    await answer('p-u3', l.session.id, 1, { selected: keys.get(1) });
    const lr = await call('post', `/practice/sessions/${l.session.id}/submit`, 'p-u3');
    expect(lr.body).toMatchObject({ score: null, accuracy: 1, correct: 1, skipped: 4 });
  });

  it('scores against the key version frozen when the session started', async () => {
    const s = await create('p-u3', { count: 5 });
    const id = s.session.id;
    const keys = await keyOf(id);
    const old = keys.get(1) as string;
    await qs.update(s.questions[0].questionId, editorId, { correctOption: wrong(old) as 'A', reason: 'test' });
    await answer('p-u3', id, 1, { selected: old });
    const r = await call('post', `/practice/sessions/${id}/submit`, 'p-u3');
    expect(r.body.questions[0]).toMatchObject({ selected: old, correctOption: old, correct: true });
    expect(r.body.correct).toBe(1);
    // restore so other tests keep their expectations
    await qs.update(s.questions[0].questionId, editorId, { correctOption: old as 'A', reason: 'restore' });
  });

  it('byTopic totals equal the question count; nextAction points at the weakest topic below 60%', async () => {
    const s = await create('p-u4', { subjectNodeIds: [polity, history], source: 'mixed', count: 50 });
    expect(s.got).toBe(14);
    const id = s.session.id;
    const keys = await keyOf(id);
    const pyq = new Set(verifiedPyqs);
    let polityCorrect = 0;
    for (const q of s.questions) {
      const k = keys.get(q.ordinal) as string;
      const right = !pyq.has(q.questionId) && polityCorrect < 3;
      if (right) polityCorrect += 1;
      await answer('p-u4', id, q.ordinal, { selected: right ? k : wrong(k) });
    }
    const r = await call('post', `/practice/sessions/${id}/submit`, 'p-u4');
    expect(r.body.byTopic).toEqual([
      { subjectNodeId: history, title: 'History', correct: 0, total: 2 },
      { subjectNodeId: polity, title: 'Polity', correct: 3, total: 12 },
    ]);
    expect(r.body.byTopic.reduce((t: number, b: { total: number }) => t + b.total, 0)).toBe(r.body.session.total);
    expect(r.body.nextAction).toEqual({ kind: 'practise_weak_topic', label: 'Practise History', subjectNodeId: history });

    const good = await create('p-u4', { count: 5 });
    const gk = await keyOf(good.session.id);
    for (const o of [1, 2, 3, 4]) await answer('p-u4', good.session.id, o, { selected: gk.get(o) });
    await answer('p-u4', good.session.id, 5, { selected: wrong(gk.get(5) as string) });
    const gr = await call('post', `/practice/sessions/${good.session.id}/submit`, 'p-u4');
    expect(gr.body.nextAction.kind).toBe('review_mistakes');

    const perfect = await create('p-u4', { count: 5 });
    const pk = await keyOf(perfect.session.id);
    for (const o of [1, 2, 3, 4, 5]) await answer('p-u4', perfect.session.id, o, { selected: pk.get(o) });
    const pr = await call('post', `/practice/sessions/${perfect.session.id}/submit`, 'p-u4');
    expect(pr.body.nextAction.kind).toBe('see_progress');
  });

  it("404 for another user's session on every route, and for malformed ids", async () => {
    const s = await create('p-owner', { count: 5 });
    const id = s.session.id;
    const routes: Array<['get' | 'post' | 'put', string, object?]> = [
      ['get', `/practice/sessions/${id}`],
      ['put', `/practice/sessions/${id}/answers/1`, { selected: 'A' }],
      ['post', `/practice/sessions/${id}/submit`],
      ['get', `/practice/sessions/${id}/results`],
    ];
    for (const [m, p, b] of routes) {
      const r = await call(m, p, 'p-intruder', b);
      expect([m, p, r.status, r.body.error?.code]).toEqual([m, p, 404, 'not_found']);
    }
    for (const [m, p, b] of routes) {
      const r = await call(m, p.replace(id, 'not-a-uuid'), 'p-owner', b);
      expect([m, p, r.status]).toEqual([m, p, 404]);
    }
    const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
    expect(row.status).toBe('in_progress');
    const sq = await db.select().from(sessionQuestions).where(eq(sessionQuestions.sessionId, id));
    expect(sq.every((q) => q.selected === null)).toBe(true);
  });

  it('402 entitlement_required when practice.session is disabled for the user', async () => {
    await call('get', '/practice/subjects', 'p-noent');
    await db.insert(entitlementOverrides).values({
      id: newId(), userId: await userId('p-noent'), featureKey: 'practice.session', enabled: false, period: 'none', reason: 'test',
    });
    const r = await call('post', '/practice/sessions', 'p-noent', cfg());
    expect(r.status).toBe(402);
    expect(r.body.error.code).toBe('entitlement_required');
  });
});
