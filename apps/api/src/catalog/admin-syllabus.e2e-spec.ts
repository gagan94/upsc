import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { syllabusNodes, users } from '../db/schema';

jest.setTimeout(30000);

describe('GET /admin/syllabus-nodes', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;
  let student: string;
  let editor: string;
  let admin: string;
  const ids = { gs1: newId(), polity: newId(), hist: newId(), c1: newId(), c2: newId(), mainsRoot: newId(), draft: newId() };

  const get = (token?: string) => {
    const r = request(app.getHttpServer()).get('/api/v1/admin/syllabus-nodes');
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };
  const node = (id: string, over: object) => ({
    id, parentId: null as string | null, path: id, level: 0, examStage: 'prelims', paper: 'GS1',
    title: 'T', slug: `as-${id}`, order: 0, status: 'published', ...over,
  });

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
    await db.insert(syllabusNodes).values([
      node(ids.gs1, { level: 1, title: 'GS1 root', order: 0 }),
      node(ids.polity, { parentId: ids.gs1, level: 2, title: 'Polity', order: 2 }),
      node(ids.hist, { parentId: ids.gs1, level: 2, title: 'History', order: 1 }),
      node(ids.c2, { parentId: ids.polity, level: 3, title: 'Federalism', order: 2 }),
      node(ids.c1, { parentId: ids.polity, level: 3, title: 'Amendments', order: 1 }),
      node(ids.mainsRoot, { examStage: 'mains', level: 1, title: 'Mains GS1', paper: 'GS1' }),
      node(ids.draft, { level: 2, title: 'Draft node', status: 'draft' }),
    ]);
    student = await signTestToken({ sub: 'as-student', email: 'as-student@example.com' });
    editor = await signTestToken({ sub: 'as-editor', email: 'as-editor@example.com' });
    admin = await signTestToken({ sub: 'as-admin', email: 'as-admin@example.com' });
    for (const t of [student, editor, admin]) await get(t);
    await db.update(users).set({ roles: ['content_editor'] }).where(eq(users.authSubject, 'as-editor'));
    await db.update(users).set({ roles: ['admin'] }).where(eq(users.authSubject, 'as-admin'));
  });
  afterAll(() => close());

  it('401 without a token', async () => {
    await get().expect(401);
  });

  it('403 for a student', async () => {
    await get(student).expect(403);
  });

  it('200 for an editor and an admin', async () => {
    await get(editor).expect(200);
    await get(admin).expect(200);
  });

  it('returns only published nodes, ordered, with the exact shape', async () => {
    const res = await get(editor).expect(200);
    const mine = new Set(Object.values(ids));
    const rows = res.body.nodes.filter((n: { id: string }) => mine.has(n.id));
    expect(Object.keys(res.body)).toEqual(['nodes']);
    expect(rows.map((n: { id: string }) => n.id)).toEqual([
      ids.mainsRoot, ids.gs1, ids.hist, ids.polity, ids.c1, ids.c2,
    ]);
    expect(Object.keys(rows[1]).sort()).toEqual(
      ['examStage', 'id', 'level', 'paper', 'parentId', 'slug', 'title'],
    );
    expect(rows[1]).toEqual({
      id: ids.gs1, slug: `as-${ids.gs1}`, title: 'GS1 root', paper: 'GS1', examStage: 'prelims', level: 1, parentId: null,
    });
  });

  it('returns level-3 children with the right parentId', async () => {
    const res = await get(admin).expect(200);
    const byId = new Map(res.body.nodes.map((n: { id: string }) => [n.id, n]));
    expect(byId.get(ids.c1)).toMatchObject({ level: 3, parentId: ids.polity });
    expect(byId.get(ids.c2)).toMatchObject({ level: 3, parentId: ids.polity });
    expect(byId.get(ids.polity)).toMatchObject({ level: 2, parentId: ids.gs1 });
    expect(byId.has(ids.draft)).toBe(false);
  });
});
