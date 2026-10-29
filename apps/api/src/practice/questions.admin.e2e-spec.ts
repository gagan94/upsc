import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { questions, questionVersions, syllabusNodes, users } from '../db/schema';

jest.setTimeout(30000);

describe('question bank admin API', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;
  let subject: string;
  let editor: string;
  let student: string;

  const call = (method: 'get' | 'post' | 'patch', path: string, token?: string, body?: object) => {
    let r = request(app.getHttpServer())[method](`/api/v1/admin/questions${path}`);
    if (token) r = r.set('Authorization', `Bearer ${token}`);
    return body ? r.send(body) : r;
  };
  const q = (n: number | string, over: object = {}) => ({
    format: 'single',
    stem: `Question number ${n}?`,
    options: [
      { key: 'A', text: 'a' },
      { key: 'B', text: 'b' },
      { key: 'C', text: 'c' },
      { key: 'D', text: 'd' },
    ],
    correctOption: 'A',
    explanation: 'Because.',
    optionReasoning: { A: 'ra', B: 'rb', C: 'rc', D: 'rd' },
    difficulty: 'medium',
    subjectNodeId: subject,
    gsPaper: 'GS1',
    ...over,
  });
  const make = async (n: number | string, over: object = {}) => {
    const r = await call('post', '', editor, q(n, over));
    expect(r.status).toBe(201);
    return r.body.question as { id: string };
  };

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
    subject = newId();
    await db.insert(syllabusNodes).values({
      id: subject, path: '/polity', level: 1, examStage: 'prelims', paper: 'gs1', title: 'Polity', slug: 'qb-polity', status: 'published',
    });
    student = await signTestToken({ sub: 'qb-student', email: 'qb-student@example.com' });
    editor = await signTestToken({ sub: 'qb-editor', email: 'qb-editor@example.com' });
    // Create the user rows via a first call, then grant the role in the database.
    await call('get', '', editor);
    await call('get', '', student);
    await db.update(users).set({ roles: ['content_editor'] }).where(eq(users.authSubject, 'qb-editor'));
  });
  afterAll(() => close());

  it('401 without a token', async () => {
    expect((await call('get', '')).status).toBe(401);
  });

  it('403 for a student on every route', async () => {
    const id = (await make('perm')).id;
    const routes: Array<['get' | 'post' | 'patch', string, object?]> = [
      ['get', ''],
      ['post', '', q('x')],
      ['get', `/${id}`],
      ['patch', `/${id}`, { topic: 't' }],
      ['post', `/${id}/publish`],
      ['post', `/${id}/retire`],
      ['post', `/${id}/verify`, {}],
      ['post', '/import', { items: [q('y')] }],
    ];
    for (const [m, p, b] of routes) {
      const res = await call(m, p, student, b);
      expect([m, p, res.status]).toEqual([m, p, 403]);
      expect(res.body.error.code).toBe('forbidden');
    }
  });

  it('editor creates a draft, unverified question, then publishes it', async () => {
    const created = await call('post', '', editor, q('flow'));
    expect(created.status).toBe(201);
    expect(created.body.question).toMatchObject({
      status: 'draft', verificationStatus: 'unverified', version: 1, correctOption: 'A', sourceType: 'platform',
    });
    const id = created.body.question.id;
    const pub = await call('post', `/${id}/publish`, editor);
    expect(pub.status).toBe(200);
    expect(pub.body.question.status).toBe('published');
    expect((await call('get', `/${id}`, editor)).body.question.status).toBe('published');
  });

  it('rejects an invalid body with validation_failed and an unknown subject node', async () => {
    const bad = await call('post', '', editor, q('bad', { options: [] }));
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('validation_failed');
    const unk = await call('post', '', editor, q('unk', { subjectNodeId: newId() }));
    expect(unk.status).toBe(400);
    expect(unk.body.error.code).toBe('validation_failed');
  });

  it('rejects a duplicate stem (case/spacing-insensitive) on create with 409', async () => {
    await make('dupe-create');
    const res = await call('post', '', editor, q('x', { stem: '  QUESTION number   dupe-create? ' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('duplicate_stem');
  });

  it('publish without explanation or full reasoning is 400 incomplete_question', async () => {
    const noExpl = await make('noexpl', { explanation: undefined });
    let res = await call('post', `/${noExpl.id}/publish`, editor);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('incomplete_question');
    const partial = await make('partial', { optionReasoning: { A: 'only' } });
    res = await call('post', `/${partial.id}/publish`, editor);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('incomplete_question');
    expect((await call('get', `/${partial.id}`, editor)).body.question.status).toBe('draft');
  });

  it('changing the correct option bumps version and records history; other edits do not', async () => {
    const { id } = await make('versions');
    let res = await call('patch', `/${id}`, editor, { topic: 'Fundamental rights' });
    expect(res.body.question).toMatchObject({ version: 1, topic: 'Fundamental rights' });
    res = await call('patch', `/${id}`, editor, { correctOption: 'C', reason: 'Key was wrong' });
    expect(res.status).toBe(200);
    expect(res.body.question).toMatchObject({ version: 2, correctOption: 'C' });
    res = await call('patch', `/${id}`, editor, { correctOption: 'C' });
    expect(res.body.question.version).toBe(2);
    const hist = await db.select().from(questionVersions).where(eq(questionVersions.questionId, id));
    expect(hist.map((h) => [h.version, h.correctOption, h.reason]).sort()).toEqual([
      [1, 'A', 'created'],
      [2, 'C', 'Key was wrong'],
    ]);
    expect(hist.find((h) => h.version === 2)?.changedBy).toBeTruthy();
  });

  it('keeps options at exactly four unique keys and the correct key among them', async () => {
    const { id } = await make('shape');
    const three = q('s').options.slice(0, 3);
    expect((await call('patch', `/${id}`, editor, { options: three })).status).toBe(400);
    const dupKeys = q('s').options.map((o) => ({ ...o, key: 'A' }));
    expect((await call('patch', `/${id}`, editor, { options: dupKeys })).status).toBe(400);
    expect((await call('patch', `/${id}`, editor, { correctOption: 'E' })).status).toBe(400);
    const got = (await call('get', `/${id}`, editor)).body.question;
    expect(got.options).toHaveLength(4);
    expect(got.correctOption).toBe('A');
  });

  it('retire hides a question from the default (published) list', async () => {
    const { id } = await make('retire');
    await call('post', `/${id}/publish`, editor);
    const ids = async (qs = '') =>
      (await call('get', `?limit=100${qs}`, editor)).body.questions.map((x: { id: string }) => x.id);
    expect(await ids()).toContain(id);
    const r = await call('post', `/${id}/retire`, editor);
    expect(r.body.question.status).toBe('retired');
    expect(await ids()).not.toContain(id);
    expect(await ids('&status=retired')).toContain(id);
  });

  it('filters by status, subject, source and text', async () => {
    const { id } = await make('findme-zebra');
    const find = async (qs: string) =>
      (await call('get', `?${qs}`, editor)).body.questions.map((x: { id: string }) => x.id);
    expect(await find('status=draft&q=ZEBRA')).toEqual([id]);
    expect(await find(`status=draft&q=zebra&subjectNodeId=${subject}&sourceType=platform`)).toEqual([id]);
    expect(await find('status=draft&q=zebra&sourceType=pyq')).toEqual([]);
    expect(await find('status=published&q=zebra')).toEqual([]);
    expect(await find('status=all&q=%25')).toEqual([]);
    expect((await call('get', '?status=bogus', editor)).status).toBe(400);
  });

  it('verify: a pyq needs year and paper', async () => {
    const { id } = await make('pyq', { sourceType: 'pyq' });
    let res = await call('post', `/${id}/verify`, editor, {});
    expect(res.status).toBe(400);
    res = await call('post', `/${id}/verify`, editor, { pyqYear: 2019 });
    expect(res.status).toBe(400);
    res = await call('post', `/${id}/verify`, editor, { pyqYear: 2019, pyqPaper: 'GS Paper I' });
    expect(res.status).toBe(200);
    expect(res.body.question).toMatchObject({ verificationStatus: 'verified', pyqYear: 2019, pyqPaper: 'GS Paper I' });
    const plain = await make('verify-plain');
    res = await call('post', `/${plain.id}/verify`, editor, {});
    expect(res.body.question.verificationStatus).toBe('verified');
  });

  it('404 for unknown or malformed ids', async () => {
    for (const id of [newId(), 'not-a-uuid']) {
      expect((await call('get', `/${id}`, editor)).status).toBe(404);
      expect((await call('patch', `/${id}`, editor, { topic: 'x' })).status).toBe(404);
      expect((await call('post', `/${id}/publish`, editor)).status).toBe(404);
    }
  });

  describe('POST /import', () => {
    it('inserts valid rows as drafts and reports indexed errors; re-import creates none', async () => {
      const good = [q('imp-1'), q('imp-2'), q('imp-3')];
      const items = [
        good[0],
        q('imp-bad-1', { options: q('z').options.slice(0, 3) }),
        good[1],
        q('imp-bad-2', { correctOption: 'F' }),
        good[2],
      ];
      const res = await call('post', '/import', editor, { items });
      expect(res.status).toBe(201);
      expect(res.body.created).toBe(3);
      expect(res.body.errors.map((e: { index: number }) => e.index)).toEqual([1, 3]);
      expect(res.body.errors.every((e: { message: string }) => e.message)).toBe(true);

      const rows = await db.select().from(questions).where(eq(questions.createdBy, (await db.select().from(users).where(eq(users.authSubject, 'qb-editor')))[0].id));
      const imported = rows.filter((r) => r.stem.startsWith('Question number imp-'));
      expect(imported).toHaveLength(3);
      expect(imported.every((r) => r.status === 'draft' && r.verificationStatus === 'unverified')).toBe(true);
      const v = await db.select().from(questionVersions).where(eq(questionVersions.questionId, imported[0].id));
      expect(v).toHaveLength(1);

      const again = await call('post', '/import', editor, { items: good.map((g) => ({ ...g, stem: g.stem.toUpperCase() + ' ' })) });
      expect(again.body.created).toBe(0);
      expect(again.body.errors).toHaveLength(3);
      expect(again.body.errors[0].message).toMatch(/already exists/);
    });

    it('flags duplicates within a batch and unknown subject nodes', async () => {
      const res = await call('post', '/import', editor, {
        items: [q('batch-dup'), q('batch-dup', { stem: 'QUESTION   number batch-dup?' }), q('nosubj', { subjectNodeId: newId() })],
      });
      expect(res.body.created).toBe(1);
      expect(res.body.errors.map((e: { index: number }) => e.index)).toEqual([1, 2]);
      expect(res.body.errors[0].message).toMatch(/duplicate/i);
      expect(res.body.errors[1].message).toMatch(/subject/i);
    });

    it('validates the envelope: 1..500 items', async () => {
      expect((await call('post', '/import', editor, { items: [] })).status).toBe(400);
      expect((await call('post', '/import', editor, {})).status).toBe(400);
      expect((await call('post', '/import', editor, { items: new Array(501).fill({}) })).status).toBe(400);
    });
  });

  describe('keyset pagination', () => {
    it('pages through rows with identical created_at with no duplicates or gaps', async () => {
      const ts = new Date('2030-01-01T00:00:00.123456Z');
      const ids = Array.from({ length: 7 }, () => newId());
      const base = (await make('page-seed')) as { id: string };
      const [tpl] = await db.select().from(questions).where(eq(questions.id, base.id));
      await db.insert(questions).values(
        ids.map((id, i) => ({ ...tpl, id, stem: `Pagination stem ${i}`, status: 'retired' as const, createdAt: ts, updatedAt: ts })),
      );
      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const res: request.Response = await call('get', `?status=retired&q=pagination%20stem&limit=3${cursor ? `&cursor=${cursor}` : ''}`, editor);
        expect(res.status).toBe(200);
        seen.push(...res.body.questions.map((x: { id: string }) => x.id));
        cursor = res.body.nextCursor;
        pages++;
      } while (cursor && pages < 10);
      expect(pages).toBe(3);
      expect(new Set(seen).size).toBe(seen.length);
      expect([...seen].sort()).toEqual([...ids].sort());
      expect(seen).toEqual([...ids].sort()); // ordered by (created_at, id)
    });

    it('rejects a malformed cursor', async () => {
      const res = await call('get', '?cursor=%25%25', editor);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_cursor');
    });
  });
});
