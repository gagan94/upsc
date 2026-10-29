import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { activities, lessons, modules, subjects, syllabusNodes } from '../db/schema';

jest.setTimeout(30000);

describe('GET /learn/subjects', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
    }));
    const nodeId = newId();
    await db.insert(syllabusNodes).values({
      id: nodeId, parentId: null, path: 'gs1', level: 0, examStage: 'prelims', paper: 'GS1',
      title: 'GS1', slug: 'gs1', order: 0, status: 'published',
    });
    const pubId = newId();
    const draftId = newId();
    await db.insert(subjects).values([
      { id: pubId, syllabusNodeId: nodeId, slug: 'polity', title: 'Polity', description: 'd', gsPaper: 'GS2', order: 1, status: 'published' },
      { id: draftId, syllabusNodeId: nodeId, slug: 'hidden', title: 'Hidden', description: 'd', gsPaper: 'GS1', order: 0, status: 'draft' },
    ]);
    const m1 = newId();
    const m2 = newId();
    const mDraft = newId();
    await db.insert(modules).values([
      { id: m1, subjectId: pubId, title: 'M1', order: 1, summary: 's', required: true, status: 'published' },
      { id: m2, subjectId: pubId, title: 'M2', order: 2, summary: 's', required: true, status: 'published' },
      { id: mDraft, subjectId: pubId, title: 'M3', order: 3, summary: 's', required: true, status: 'draft' },
    ]);
    const mk = (moduleId: string, order: number, type: 'lesson' | 'quiz', status = 'published') =>
      ({ id: newId(), moduleId, type, title: `A${order}`, order, required: true, estMinutes: 5, status });
    const acts = [
      mk(m1, 1, 'lesson'), mk(m1, 2, 'lesson'), mk(m2, 1, 'lesson'), mk(m2, 2, 'quiz'),
      mk(mDraft, 1, 'lesson'),
    ];
    await db.insert(activities).values(acts);
    const lessonActs = [acts[0], acts[1], acts[2], acts[4]];
    await db.insert(lessons).values(
      lessonActs.map((a) => ({ activityId: a.id, summary: 's', bodyBlocks: [{ type: 'p', text: 'secret' }] })),
    );
  });
  afterAll(() => close());

  it('401 without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/learn/subjects').expect(401);
  });

  it('returns only published subjects with counts and no lesson content', async () => {
    const token = await signTestToken({ sub: 'cat-1' });
    const res = await request(app.getHttpServer())
      .get('/api/v1/learn/subjects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.subjects).toHaveLength(1);
    expect(res.body.subjects[0]).toMatchObject({
      slug: 'polity', title: 'Polity', gsPaper: 'GS2', moduleCount: 2, lessonCount: 3,
    });
    expect(JSON.stringify(res.body)).not.toContain('bodyBlocks');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});
