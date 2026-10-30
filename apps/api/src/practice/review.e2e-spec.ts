import { INestApplication } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { sessionQuestions, sessions, syllabusNodes, users } from '../db/schema';
import type { SeedContext } from '../seed/run-seed';
import { seedBilling } from '../seed/seed-billing';
import { QuestionsService } from './questions.service';
import { OTHERS_MIN_SAMPLE } from './review.service';

jest.setTimeout(90000);

const KEYS = ['A', 'B', 'C', 'D'] as const;
type Key = (typeof KEYS)[number];
const EXPLANATION = 'REVIEW-EXPLANATION because of the reason.';
const REASONING = { A: 'rsn-A', B: 'rsn-B', C: 'rsn-C', D: 'rsn-D' };

describe('answer review, mistakes, bookmarks, attempts, reports', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;
  let qs: QuestionsService;
  let editorId: string;
  let n = 0;

  const call = async (method: 'get' | 'post' | 'put' | 'delete', path: string, sub?: string, body?: object) => {
    let r = request(app.getHttpServer())[method](`/api/v1${path}`);
    if (sub) r = r.set('Authorization', `Bearer ${await signTestToken({ sub, email: `${sub}@example.com` })}`);
    return body ? r.send(body) : r;
  };
  const uid = async (sub: string) => (await db.select().from(users).where(eq(users.authSubject, sub)))[0].id;
  const rowsOf = async <T>(q: ReturnType<typeof sql>): Promise<T[]> => {
    const res: unknown = await db.execute(q);
    return (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as T[];
  };
  const node = async (slug: string, title: string) => {
    const id = newId();
    await db.insert(syllabusNodes).values({ id, path: slug, level: 3, examStage: 'prelims', paper: 'GS Paper I', title, slug, status: 'published' });
    return id;
  };
  const question = async (subjectNodeId: string, over: object = {}) => {
    n += 1;
    const q = await qs.create(editorId, {
      format: 'single',
      stem: `Review question ${n}?`,
      options: KEYS.map((key) => ({ key, text: `option ${key}` })),
      correctOption: KEYS[n % 4],
      explanation: EXPLANATION,
      optionReasoning: REASONING,
      misconception: { option: 'B', text: 'looks plausible' },
      difficulty: 'medium',
      subjectNodeId,
      gsPaper: 'GS1',
      sourceType: 'platform',
      ...over,
    });
    await qs.publish(q.id);
    return q.id;
  };
  /** A node with exactly five published questions, so a 5-question session always holds all of them. */
  const topic = async (slug: string, title: string, longStems = false) => {
    const id = await node(slug, title);
    const qids: string[] = [];
    for (let i = 0; i < 5; i++) qids.push(await question(id, longStems ? { stem: `Long stem ${slug} ${i} ${'x'.repeat(400)}` } : {}));
    return { id, qids };
  };
  const keyOf = async (sessionId: string): Promise<Map<number, string>> => {
    const rows = await rowsOf<{ ordinal: number; correct_option: string }>(sql`select sq.ordinal, qv.correct_option from practice.session_questions sq
      join practice.question_versions qv on qv.question_id = sq.question_id and qv.version = sq.question_version
      where sq.session_id = ${sessionId}::uuid`);
    return new Map(rows.map((r) => [Number(r.ordinal), r.correct_option]));
  };
  const wrongOf = (k: string): Key => KEYS.find((x) => x !== k) as Key;
  const create = async (sub: string, subject: string, over: object = {}) => {
    const r = await call('post', '/practice/sessions', sub, { subjectNodeIds: [subject], source: 'platform', count: 5, mode: 'test', timed: false, ...over });
    expect(r.status).toBe(201);
    return { id: r.body.session.id as string, questions: r.body.questions as { ordinal: number; questionId: string }[] };
  };
  /** Create, answer ('right' | 'wrong' | 'skip' | explicit key per ordinal) and optionally submit. */
  const play = async (
    sub: string,
    subject: string,
    pick: (ordinal: number) => 'right' | 'wrong' | 'skip' | Key = () => 'right',
    opts: { submit?: boolean; confidence?: 'guess' | 'sure'; over?: object } = {},
  ) => {
    const s = await create(sub, subject, opts.over);
    await answerAll(sub, s.id, pick, opts.confidence);
    if (opts.submit !== false) expect((await call('post', `/practice/sessions/${s.id}/submit`, sub)).status).toBe(200);
    return s;
  };
  const answerAll = async (sub: string, id: string, pick: (o: number) => 'right' | 'wrong' | 'skip' | Key, confidence?: 'guess' | 'sure') => {
    const keys = await keyOf(id);
    for (const [ordinal, key] of keys) {
      const p = pick(ordinal);
      if (p === 'skip') continue;
      const selected = p === 'right' ? key : p === 'wrong' ? wrongOf(key) : p;
      const r = await call('put', `/practice/sessions/${id}/answers/${ordinal}`, sub, { selected, ...(confidence ? { confidence } : {}) });
      expect(r.status).toBe(200);
    }
  };
  const submit = (sub: string, id: string) => call('post', `/practice/sessions/${id}/submit`, sub);
  const mistakes = async (sub: string, qsx = '') => {
    const r = await call('get', `/practice/mistakes${qsx}`, sub);
    expect(r.status).toBe(200);
    return r.body.items as { questionId: string; stem: string; subjectTitle: string; reason: string; timesWrong: number; lastSeen: string }[];
  };
  const review = (sub: string, id: string, ordinal: number) => call('get', `/practice/sessions/${id}/questions/${ordinal}/review`, sub);

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({ config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } } }));
    await seedBilling(db, {} as SeedContext);
    qs = app.get(QuestionsService);
    await call('get', '/practice/subjects', 'rv-editor');
    editorId = await uid('rv-editor');
    await db.update(users).set({ roles: ['content_editor'] }).where(eq(users.id, editorId));
    qs = app.get(QuestionsService);
  });
  afterAll(() => close());

  it('401 on every route without a token', async () => {
    const id = newId();
    const routes: Array<['get' | 'post' | 'put' | 'delete', string]> = [
      ['get', `/practice/sessions/${id}/questions/1/review`],
      ['put', `/practice/sessions/${id}/questions/1/reasoning`],
      ['put', `/practice/questions/${id}/bookmark`],
      ['delete', `/practice/questions/${id}/bookmark`],
      ['get', '/practice/bookmarks'],
      ['get', '/practice/mistakes'],
      ['post', `/practice/sessions/${id}/retry`],
      ['get', '/practice/attempts'],
      ['post', `/practice/questions/${id}/report`],
      ['get', '/admin/question-reports'],
    ];
    for (const [m, p] of routes) expect([m, p, (await call(m, p)).status]).toEqual([m, p, 401]);
  });

  describe('review', () => {
    let t: Awaited<ReturnType<typeof topic>>;
    beforeAll(async () => {
      t = await topic('rv-review', 'Review Topic');
    });

    it('409 not_submitted before submit; no key in the error', async () => {
      const s = await create('rv-a', t.id);
      const r = await review('rv-a', s.id, 1);
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe('not_submitted');
      expect(JSON.stringify(r.body)).not.toMatch(/correctOption|REVIEW-EXPLANATION/);
      expect((await call('put', `/practice/sessions/${s.id}/questions/1/reasoning`, 'rv-a', { text: 'x' })).status).toBe(409);
    });

    it('after submit returns key, explanation, reasoning, misconception, your answer and flags', async () => {
      const s = await play('rv-a', t.id, (o) => (o === 1 ? 'right' : o === 2 ? 'wrong' : 'skip'), { confidence: 'sure' });
      const keys = await keyOf(s.id);
      const r1 = await review('rv-a', s.id, 1);
      expect(r1.status).toBe(200);
      expect(r1.body).toMatchObject({
        correctOption: keys.get(1),
        yourAnswer: keys.get(1),
        correct: true,
        confidence: 'sure',
        explanation: EXPLANATION,
        optionReasoning: REASONING,
        misconception: { option: 'B', text: 'looks plausible' },
        bookmarked: false,
        reasoningText: null,
        othersAnswered: { sample: expect.any(Number), pctByOption: null },
        question: { format: 'single', difficulty: 'medium', isSample: false },
      });
      expect(r1.body.question.stem).toMatch(/^Review question/);
      expect(r1.body.question.options).toHaveLength(4);
      expect(typeof r1.body.timeMs).toBe('number');
      const r2 = await review('rv-a', s.id, 2);
      expect(r2.body).toMatchObject({ yourAnswer: wrongOf(keys.get(2) as string), correct: false });
      const r3 = await review('rv-a', s.id, 3);
      expect(r3.body).toMatchObject({ yourAnswer: null, correct: null, correctOption: keys.get(3) });
      expect((await review('rv-a', s.id, 6)).status).toBe(404);
      expect((await review('rv-a', s.id, 0)).status).toBe(404);
    });

    it('reads the correct option at the frozen question version, not the live key', async () => {
      const s = await play('rv-a', t.id, () => 'right');
      const before = await keyOf(s.id);
      await db.execute(sql`update practice.questions set correct_option = case correct_option when 'A' then 'B' else 'A' end, version = version + 1
        where id in (select question_id from practice.session_questions where session_id = ${s.id}::uuid)`);
      const r = await review('rv-a', s.id, 1);
      expect(r.body.correctOption).toBe(before.get(1));
      expect(r.body.correct).toBe(true);
    });

    it('is_sample reflects platform_sample verification', async () => {
      const s = await play('rv-a', t.id, () => 'right');
      const q = s.questions.find((x) => x.ordinal === 1) as { questionId: string };
      await db.execute(sql`update practice.questions set verification_status = 'platform_sample' where id = ${q.questionId}::uuid`);
      expect((await review('rv-a', s.id, 1)).body.question.isSample).toBe(true);
    });

    it('reasoning: saved, returned in review, trimmed, capped at 1000, cleared with empty text', async () => {
      const s = await play('rv-a', t.id, () => 'right');
      const put = (text: unknown) => call('put', `/practice/sessions/${s.id}/questions/2/reasoning`, 'rv-a', { text });
      expect((await put('  I eliminated A and D.  ')).status).toBe(200);
      expect((await review('rv-a', s.id, 2)).body.reasoningText).toBe('I eliminated A and D.');
      expect((await put('x'.repeat(1001))).status).toBe(400);
      expect((await put(5)).status).toBe(400);
      expect((await put('x'.repeat(1000))).status).toBe(200);
      expect((await put('')).status).toBe(200);
      expect((await review('rv-a', s.id, 2)).body.reasoningText).toBeNull();
    });

    it('isolation: another user gets 404 for review and reasoning', async () => {
      const s = await play('rv-a', t.id, () => 'right');
      await call('get', '/practice/subjects', 'rv-b');
      expect((await review('rv-b', s.id, 1)).status).toBe(404);
      expect((await call('put', `/practice/sessions/${s.id}/questions/1/reasoning`, 'rv-b', { text: 'x' })).status).toBe(404);
      expect((await review('rv-b', 'not-a-uuid', 1)).status).toBe(404);
      expect((await review('rv-b', newId(), 1)).status).toBe(404);
    });

    it('an expired (auto-submitted) session can be reviewed', async () => {
      const fresh = await topic('rv-review-exp', 'Review Expiry');
      const s = await create('rv-a', fresh.id, { timed: true });
      await answerAll('rv-a', s.id, () => 'wrong');
      await db.execute(sql`update practice.sessions set ends_at = now() - interval '1 second' where id = ${s.id}::uuid`);
      const r = await review('rv-a', s.id, 1);
      expect(r.status).toBe(200);
      expect(r.body.correct).toBe(false);
    });
  });

  describe('how others answered', () => {
    it('hides percentages below OTHERS_MIN_SAMPLE, shows them at the boundary, and ignores retries and in-progress answers', async () => {
      expect(OTHERS_MIN_SAMPLE).toBe(100);
      const t = await topic('rv-others', 'Others Topic');
      const pickA = () => 'A' as Key;
      const s1 = await play('rv-o1', t.id, pickA);
      await play('rv-o2', t.id, pickA);
      await play('rv-o3', t.id, pickA);
      const q1 = s1.questions.find((x) => x.ordinal === 1) as { questionId: string };
      const others = async () => (await review('rv-o1', s1.id, 1)).body.othersAnswered as { sample: number; pctByOption: Record<string, number> | null };
      expect(await others()).toEqual({ sample: 3, pctByOption: null });

      // 96 synthetic first attempts from distinct users: 56 pick A, 40 pick B  -> sample 99 (still hidden)
      const add = async (count: number, selected: Key | null, status: 'submitted' | 'in_progress' = 'submitted') => {
        const ids = Array.from({ length: count }, () => newId());
        await db.insert(users).values(ids.map((id) => ({ id, authSubject: `syn-${id}`, email: `syn-${id}@example.com`, name: 'Synthetic' })));
        const sids = ids.map(() => newId());
        await db.insert(sessions).values(
          ids.map((userId, i) => ({
            id: sids[i], userId, kind: 'practice' as const, mode: 'test' as const, timed: false,
            config: { subjectNodeIds: [t.id], source: 'platform' as const, count: 5 }, marking: { correct: 2, incorrect: -0.66 },
            status, submittedAt: status === 'submitted' ? new Date(Date.now() - 60_000) : null,
          })),
        );
        await db.insert(sessionQuestions).values(
          sids.map((sessionId) => ({ sessionId, ordinal: 1, questionId: q1.questionId, questionVersion: 1, selected, answeredAt: new Date() })),
        );
      };
      await add(56, 'A');
      await add(40, 'B');
      expect(await others()).toEqual({ sample: 99, pctByOption: null });
      await add(5, 'D', 'in_progress'); // not submitted: not counted
      await add(5, null); // submitted but skipped: not counted
      expect((await others()).sample).toBe(99);
      await add(1, 'A');
      expect(await others()).toEqual({ sample: 100, pctByOption: { A: 60, B: 40, C: 0, D: 0 } });

      // rv-o1 retries and now answers B: their first answer (A) still counts, percentages do not move.
      const retry = await call('post', `/practice/sessions/${s1.id}/retry`, 'rv-o1');
      expect(retry.status).toBe(201);
      await answerAll('rv-o1', retry.body.session.id, () => 'B');
      expect((await submit('rv-o1', retry.body.session.id)).status).toBe(200);
      expect(await others()).toEqual({ sample: 100, pctByOption: { A: 60, B: 40, C: 0, D: 0 } });
      // And the same through the retry session's own review.
      const viaRetry = await review('rv-o1', retry.body.session.id, 1);
      expect(viaRetry.body.othersAnswered).toEqual({ sample: 100, pctByOption: { A: 60, B: 40, C: 0, D: 0 } });
      // Only aggregates are exposed.
      expect(JSON.stringify(viaRetry.body)).not.toMatch(/syn-|Synthetic|rv-o2/);
    });
  });

  describe('mistake notebook', () => {
    it('adds incorrect answers, counts a repeat once, ignores double submit, resolves on a correct answer, reopens on a new miss', async () => {
      const t = await topic('rv-mis', 'Mistake Topic', true);
      const s = await play('rv-m1', t.id, (o) => (o <= 2 ? 'wrong' : o === 3 ? 'skip' : 'right'));
      expect((await submit('rv-m1', s.id)).status).toBe(200); // double submit
      expect((await submit('rv-m1', s.id)).status).toBe(200);
      let items = await mistakes('rv-m1');
      expect(items).toHaveLength(2);
      expect(items.every((i) => i.reason === 'incorrect' && i.timesWrong === 1 && i.subjectTitle === 'Mistake Topic')).toBe(true);
      expect(items.every((i) => i.stem.length <= 140)).toBe(true);
      expect((await call('get', '/home', 'rv-m1')).body.practice.mistakesCount).toBe(2);
      const missed = s.questions.filter((q) => q.ordinal <= 2).map((q) => q.questionId);
      expect(items.map((i) => i.questionId).sort()).toEqual([...missed].sort());

      // Retry of the same questions, wrong again -> timesWrong 2 (a read in between changes nothing).
      const r1 = await call('post', `/practice/sessions/${s.id}/retry`, 'rv-m1');
      await answerAll('rv-m1', r1.body.session.id, (o) => (o <= 2 ? 'wrong' : 'right'));
      await submit('rv-m1', r1.body.session.id);
      await submit('rv-m1', r1.body.session.id);
      items = await mistakes('rv-m1');
      expect(items.map((i) => i.timesWrong)).toEqual([2, 2]);

      // Third attempt: all right -> resolved and hidden by default.
      const r2 = await call('post', `/practice/sessions/${s.id}/retry`, 'rv-m1');
      await answerAll('rv-m1', r2.body.session.id, () => 'right');
      await submit('rv-m1', r2.body.session.id);
      expect(await mistakes('rv-m1')).toHaveLength(0);
      const all = await mistakes('rv-m1', '?includeResolved=true');
      expect(all).toHaveLength(2);
      expect((await call('get', '/home', 'rv-m1')).body.practice.mistakesCount).toBe(0);

      // Missing it again reopens the entry and increments.
      const r3 = await call('post', `/practice/sessions/${s.id}/retry`, 'rv-m1');
      await answerAll('rv-m1', r3.body.session.id, (o) => (o === 1 ? 'wrong' : 'right'));
      await submit('rv-m1', r3.body.session.id);
      items = await mistakes('rv-m1');
      expect(items).toHaveLength(1);
      expect(items[0].timesWrong).toBe(3);
    });

    it('records guessed-correct answers only when no entry exists, and a sure-correct answer resolves them', async () => {
      const t = await topic('rv-guess', 'Guess Topic');
      const s = await play('rv-g1', t.id, () => 'right', { confidence: 'guess' });
      let items = await mistakes('rv-g1');
      expect(items).toHaveLength(5);
      expect(items.every((i) => i.reason === 'guessed' && i.timesWrong === 1)).toBe(true);
      const again = await call('post', `/practice/sessions/${s.id}/retry`, 'rv-g1');
      await answerAll('rv-g1', again.body.session.id, () => 'right', 'guess');
      await submit('rv-g1', again.body.session.id);
      expect((await mistakes('rv-g1')).every((i) => i.timesWrong === 1)).toBe(true); // guessed never counts as wrong
      const sure = await call('post', `/practice/sessions/${s.id}/retry`, 'rv-g1');
      await answerAll('rv-g1', sure.body.session.id, () => 'right', 'sure');
      await submit('rv-g1', sure.body.session.id);
      expect(await mistakes('rv-g1')).toHaveLength(0);

      // An incorrect entry stays 'incorrect' when later answered correctly with a guess.
      const w = await play('rv-g2', t.id, () => 'wrong');
      const g = await call('post', `/practice/sessions/${w.id}/retry`, 'rv-g2');
      await answerAll('rv-g2', g.body.session.id, () => 'right', 'guess');
      await submit('rv-g2', g.body.session.id);
      items = await mistakes('rv-g2');
      expect(items).toHaveLength(5);
      expect(items.every((i) => i.reason === 'incorrect')).toBe(true);
    });

    it('an auto-submitted (expired) session records its mistakes once', async () => {
      const t = await topic('rv-exp', 'Expiry Topic');
      const s = await create('rv-e1', t.id, { timed: true });
      await answerAll('rv-e1', s.id, () => 'wrong');
      await db.execute(sql`update practice.sessions set ends_at = now() - interval '1 second' where id = ${s.id}::uuid`);
      await call('get', `/practice/sessions/${s.id}`, 'rv-e1');
      await call('get', `/practice/sessions/${s.id}/results`, 'rv-e1');
      await submit('rv-e1', s.id);
      const items = await mistakes('rv-e1');
      expect(items).toHaveLength(5);
      expect(items.every((i) => i.timesWrong === 1)).toBe(true);
    });

    it('filters by subject node and is isolated per user', async () => {
      const t1 = await topic('rv-f1', 'Filter One');
      const t2 = await topic('rv-f2', 'Filter Two');
      await play('rv-f', t1.id, () => 'wrong');
      await play('rv-f', t2.id, (o) => (o === 1 ? 'wrong' : 'right'));
      expect(await mistakes('rv-f')).toHaveLength(6);
      expect(await mistakes('rv-f', `?subject=${t1.id}`)).toHaveLength(5);
      expect(await mistakes('rv-f', `?subject=${t2.id}`)).toHaveLength(1);
      expect((await call('get', '/practice/mistakes?subject=nope', 'rv-f')).status).toBe(400);
      await call('get', '/practice/subjects', 'rv-f-other');
      expect(await mistakes('rv-f-other')).toEqual([]);
    });
  });

  describe('bookmarks', () => {
    it('PUT and DELETE are idempotent; list, results and home reflect them; unseen questions are 404', async () => {
      const t = await topic('rv-bm', 'Bookmark Topic');
      const s = await play('rv-bk', t.id, () => 'right');
      const qid = s.questions[0].questionId;
      const put = () => call('put', `/practice/questions/${qid}/bookmark`, 'rv-bk');
      expect((await put()).status).toBe(200);
      expect((await put()).status).toBe(200);
      const list = await call('get', '/practice/bookmarks', 'rv-bk');
      expect(list.body.items).toHaveLength(1);
      expect(list.body.items[0]).toMatchObject({ questionId: qid, subjectTitle: 'Bookmark Topic' });
      expect((await call('get', `/practice/sessions/${s.id}/results`, 'rv-bk')).body.questions.filter((q: { bookmarked: boolean }) => q.bookmarked)).toHaveLength(1);
      const ord = s.questions[0].ordinal;
      expect((await review('rv-bk', s.id, ord)).body.bookmarked).toBe(true);
      expect((await call('get', '/home', 'rv-bk')).body.practice.bookmarksCount).toBe(1);

      // Isolation: user B never sees it, and cannot bookmark a question they have never been shown.
      await call('get', '/practice/subjects', 'rv-bk-b');
      expect((await call('get', '/practice/bookmarks', 'rv-bk-b')).body.items).toEqual([]);
      expect((await call('put', `/practice/questions/${qid}/bookmark`, 'rv-bk-b')).status).toBe(404);
      expect((await call('delete', `/practice/questions/${qid}/bookmark`, 'rv-bk-b')).status).toBe(200); // deletes nothing of A's
      expect((await call('get', '/practice/bookmarks', 'rv-bk')).body.items).toHaveLength(1);
      expect((await call('put', `/practice/questions/${newId()}/bookmark`, 'rv-bk')).status).toBe(404);
      expect((await call('put', '/practice/questions/nope/bookmark', 'rv-bk')).status).toBe(404);

      expect((await call('delete', `/practice/questions/${qid}/bookmark`, 'rv-bk')).status).toBe(200);
      expect((await call('delete', `/practice/questions/${qid}/bookmark`, 'rv-bk')).status).toBe(200);
      expect((await call('get', '/practice/bookmarks', 'rv-bk')).body.items).toEqual([]);
      expect((await call('get', '/home', 'rv-bk')).body.practice.bookmarksCount).toBe(0);
    });
  });

  describe('attempts', () => {
    it('lists submitted/expired sessions newest first and pages by keyset across equal timestamps', async () => {
      const t = await topic('rv-att', 'Attempts Topic');
      const made: string[] = [];
      for (let i = 0; i < 5; i++) made.push((await play('rv-at', t.id, i % 2 ? () => 'wrong' : () => 'right')).id);
      await create('rv-at', t.id); // in progress: excluded
      // Three of them share one timestamp.
      await db.execute(sql`update practice.sessions set submitted_at = '2026-01-01T10:00:00.123456Z' where id in (${sql.join(made.slice(0, 3).map((x) => sql`${x}::uuid`), sql`, `)})`);
      await db.execute(sql`update practice.sessions set submitted_at = '2026-01-02T10:00:00Z' where id = ${made[3]}::uuid`);
      await db.execute(sql`update practice.sessions set submitted_at = '2026-01-03T10:00:00Z' where id = ${made[4]}::uuid`);
      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const r = await call('get', `/practice/attempts?limit=2${cursor ? `&cursor=${cursor}` : ''}`, 'rv-at');
        expect(r.status).toBe(200);
        for (const a of r.body.attempts) seen.push(a.id);
        cursor = r.body.nextCursor;
        pages += 1;
      } while (cursor && pages < 10);
      expect(pages).toBe(3);
      expect(seen).toHaveLength(5);
      expect(new Set(seen).size).toBe(5);
      expect(seen[0]).toBe(made[4]);
      expect(seen[1]).toBe(made[3]);
      expect(seen.slice(2)).toEqual([...made.slice(0, 3)].sort().reverse());
      const full = await call('get', '/practice/attempts', 'rv-at');
      expect(full.body.attempts[0]).toMatchObject({
        id: made[4], kind: 'practice', mode: 'test', total: 5, correct: 5, accuracy: 1, score: 10, title: 'Attempts Topic practice',
      });
      expect(full.body.attempts[0].submittedAt).toBe('2026-01-03T10:00:00.000Z');
      expect(full.body.nextCursor).toBeNull();
      expect((await call('get', '/practice/attempts?cursor=garbage!', 'rv-at')).status).toBe(400);
      await call('get', '/practice/subjects', 'rv-at-b');
      expect((await call('get', '/practice/attempts', 'rv-at-b')).body).toEqual({ attempts: [], nextCursor: null });
    });
  });

  describe('retry', () => {
    it('creates a new retry session over the same questions at their current version, same mode and timing', async () => {
      const t = await topic('rv-retry', 'Retry Topic');
      const s = await play('rv-r1', t.id, () => 'wrong', { over: { mode: 'learning', timed: true } });
      await db.execute(sql`update practice.questions set version = version + 1 where subject_node_id = ${t.id}::uuid`);
      const r = await call('post', `/practice/sessions/${s.id}/retry`, 'rv-r1');
      expect(r.status).toBe(201);
      expect(r.body.session.id).not.toBe(s.id);
      expect(r.body.session).toMatchObject({ mode: 'learning', timed: true, status: 'in_progress', total: 5 });
      expect(r.body.session.remainingSeconds).toBeGreaterThan(0);
      expect(r.body.questions.map((q: { questionId: string }) => q.questionId)).toEqual(s.questions.map((q) => q.questionId));
      const rows = await rowsOf<{ question_version: number; kind: string }>(sql`select sq.question_version, s.kind from practice.session_questions sq join practice.sessions s on s.id = sq.session_id where s.id = ${r.body.session.id}::uuid`);
      expect(rows.every((x) => Number(x.question_version) === 2 && x.kind === 'retry')).toBe(true);
      expect(JSON.stringify(r.body)).not.toMatch(/correctOption|REVIEW-EXPLANATION/);
    });

    it('409 not_submitted for an open session; 404 for another user or unknown id', async () => {
      const t = await topic('rv-retry2', 'Retry Two');
      const open = await create('rv-r1', t.id);
      const r = await call('post', `/practice/sessions/${open.id}/retry`, 'rv-r1');
      expect(r.status).toBe(409);
      expect(r.body.error.code).toBe('not_submitted');
      const done = await play('rv-r1', t.id);
      await call('get', '/practice/subjects', 'rv-r2');
      expect((await call('post', `/practice/sessions/${done.id}/retry`, 'rv-r2')).status).toBe(404);
      expect((await call('post', `/practice/sessions/${newId()}/retry`, 'rv-r1')).status).toBe(404);
      expect((await call('post', '/practice/sessions/nope/retry', 'rv-r1')).status).toBe(404);
    });
  });

  describe('reports', () => {
    it('a student can report a question they were shown; editors see it, students do not', async () => {
      const t = await topic('rv-rep', 'Report Topic');
      const s = await play('rv-p1', t.id);
      const qid = s.questions[0].questionId;
      const r = await call('post', `/practice/questions/${qid}/report`, 'rv-p1', { type: 'wrong_key', text: 'The key looks wrong.' });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({ id: expect.any(String), status: 'open' });
      expect((await call('post', `/practice/questions/${qid}/report`, 'rv-p1', { type: 'typo' })).status).toBe(201); // text optional
      expect((await call('post', `/practice/questions/${qid}/report`, 'rv-p1', { type: 'bogus' })).status).toBe(400);
      expect((await call('post', `/practice/questions/${qid}/report`, 'rv-p1', { type: 'other', text: 'x'.repeat(1001) })).status).toBe(400);
      // Not shown to this user -> 404, same as an unknown id.
      await call('get', '/practice/subjects', 'rv-p2');
      expect((await call('post', `/practice/questions/${qid}/report`, 'rv-p2', { type: 'typo' })).status).toBe(404);
      expect((await call('post', `/practice/questions/${newId()}/report`, 'rv-p1', { type: 'typo' })).status).toBe(404);

      expect((await call('get', '/admin/question-reports', 'rv-p1')).status).toBe(403);
      const list = await call('get', '/admin/question-reports', 'rv-editor');
      expect(list.status).toBe(200);
      const mine = (list.body.reports as { id: string; questionId: string; type: string; text: string | null; status: string; stem: string }[]).filter((x) => x.questionId === qid);
      expect(mine).toHaveLength(2);
      expect(mine.map((x) => x.type).sort()).toEqual(['typo', 'wrong_key']);
      expect(mine.every((x) => x.status === 'open' && x.stem.startsWith('Review question'))).toBe(true);
      await db.execute(sql`update practice.issue_reports set status = 'resolved' where question_id = ${qid}::uuid and type = 'typo'`);
      const open = await call('get', '/admin/question-reports', 'rv-editor');
      expect(open.body.reports.filter((x: { questionId: string }) => x.questionId === qid)).toHaveLength(1);
    });
  });

  describe('GET /home practice block', () => {
    it('shows the last three closed sessions newest first with human titles, plus mistakes and bookmarks', async () => {
      const a = await topic('rv-ha', 'Alpha');
      const b = await topic('rv-hb', 'Beta');
      const s1 = await play('rv-h', a.id, () => 'right');
      const s2 = await play('rv-h', b.id, (o) => (o <= 2 ? 'wrong' : 'right'));
      const s3 = await play('rv-h', a.id, () => 'wrong');
      const s4 = await play('rv-h', b.id, () => 'right');
      await create('rv-h', a.id); // open: excluded
      await db.execute(sql`update practice.sessions set submitted_at = now() - interval '4 days' where id = ${s1.id}::uuid`);
      await db.execute(sql`update practice.sessions set submitted_at = now() - interval '3 days' where id = ${s2.id}::uuid`);
      await db.execute(sql`update practice.sessions set submitted_at = now() - interval '2 days' where id = ${s3.id}::uuid`);
      await db.execute(sql`update practice.sessions set submitted_at = now() - interval '1 days' where id = ${s4.id}::uuid`);
      await call('put', `/practice/questions/${s1.questions[0].questionId}/bookmark`, 'rv-h');
      const h = (await call('get', '/home', 'rv-h')).body.practice;
      expect(h.recentSessions.map((x: { id: string }) => x.id)).toEqual([s4.id, s3.id, s2.id]);
      expect(h.recentSessions.map((x: { title: string }) => x.title)).toEqual(['Beta practice', 'Alpha practice', 'Beta practice']);
      expect(h.recentSessions[0]).toEqual({ id: s4.id, title: 'Beta practice', accuracy: 1, submittedAt: expect.any(String) });
      expect(h.recentSessions[1].accuracy).toBe(0);
      expect(h.mistakesCount).toBe(5); // s3 re-missed all five Alpha questions; Beta's two were resolved by s4
      expect(h.bookmarksCount).toBe(1);
      expect(Object.keys(h).sort()).toEqual(['bookmarksCount', 'mistakesCount', 'recentSessions']);
      // Another user sees none of it.
      expect((await call('get', '/home', 'rv-h-other')).body.practice).toEqual({ recentSessions: [], mistakesCount: 0, bookmarksCount: 0 });
    });

    it('titles a multi-subject session "Practice set"', async () => {
      const a = await topic('rv-ma', 'Multi A');
      const b = await topic('rv-mb', 'Multi B');
      await play('rv-hm', a.id, () => 'right', { over: { subjectNodeIds: [a.id, b.id], count: 10 } });
      const h = (await call('get', '/home', 'rv-hm')).body.practice;
      expect(h.recentSessions[0].title).toBe('Practice set');
    });
  });
});
