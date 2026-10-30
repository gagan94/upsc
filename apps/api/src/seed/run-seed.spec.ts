import { eq, sql } from 'drizzle-orm';
import { createTestDb } from '../../test/db';
import type { Db } from '../db/db.module';
import {
  bookmarks,
  examDates,
  featureCatalog,
  goals,
  mistakeEntries,
  planEntitlements,
  sessionQuestions,
  plans,
  preparationProfiles,
  questions,
  sessions,
  studySessions,
  subjects,
  syllabusNodes,
  tasks,
  users,
} from '../db/schema';
import { FEATURE_KEYS } from '../billing/feature-keys';
import { FakeAuthAdmin, type AuthAdmin } from './auth-admin';
import { runSeed } from './run-seed';
import { seedPlanner } from './seed-planner';
import { loadQuestions, seedQuestions, type QuestionSeed } from './seed-questions';
import { scoreAnswers } from '../practice/scoring';

jest.setTimeout(30000);

const TABLES = [
  'identity.users',
  'identity.profiles',
  'billing.feature_catalog',
  'billing.plans',
  'billing.plan_entitlements',
  'catalog.syllabus_nodes',
  'catalog.subjects',
  'catalog.modules',
  'catalog.activities',
  'catalog.lessons',
  'practice.questions',
  'practice.question_versions',
  'practice.sessions',
  'practice.session_questions',
  'practice.mistake_entries',
  'practice.bookmarks',
  'planner.tasks',
  'planner.study_sessions',
  'planner.goals',
  'planner.exam_dates',
  'identity.preparation_profiles',
  'identity.study_preferences',
];

describe('runSeed', () => {
  let db: Db;
  let close: () => Promise<void>;
  const authAdmin = new FakeAuthAdmin();
  // Pinned clock (11:30 IST) so every date-dependent assertion is deterministic.
  const NOW = new Date('2026-10-30T06:00:00Z');
  const opts = { demoPassword: 'test-password-1', authAdmin, now: NOW };

  const counts = async (): Promise<Record<string, number>> => {
    const out: Record<string, number> = {};
    for (const t of TABLES) {
      const r = await db.execute(sql.raw(`select count(*)::int as c from ${t}`));
      const rows = (Array.isArray(r) ? r : (r as { rows: unknown[] }).rows) as { c: number }[];
      out[t] = rows[0].c;
    }
    return out;
  };

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
  });
  afterAll(async () => {
    await close();
  });

  const expected = {
    users: 3,
    plans: 1,
    subjects: 8,
    modules: 12,
    activities: 23,
    lessons: 15,
    questions: 100,
    tasks: 8,
    sessions: 5,
    practiceSessions: 3,
    examDates: 2,
  };

  it('seeds the demo dataset and is idempotent', async () => {
    expect(await runSeed(db, opts)).toEqual(expected);
    const before = await counts();
    expect(await runSeed(db, opts)).toEqual(expected);
    expect(await counts()).toEqual(before);
    expect(before['identity.profiles']).toBe(3);
    expect(before['catalog.syllabus_nodes']).toBe(14);
  });

  it('creates users with roles linked to auth subjects', async () => {
    const [admin] = await db.select().from(users).where(eq(users.email, 'admin@example.com'));
    const [student] = await db.select().from(users).where(eq(users.email, 'student@example.com'));
    expect(admin.roles).toEqual(['admin']);
    expect(student.roles).toEqual(['student']);
    expect(student.name).toBe('Vinayaka');
    expect(admin.authSubject).toBe((await authAdmin.ensureUser({ email: 'admin@example.com', password: 'x', name: 'Admin' })).subject);
    expect(student.authSubject).toBe(
      (await authAdmin.ensureUser({ email: 'student@example.com', password: 'x', name: 'Vinayaka' })).subject,
    );
  });

  it('adds the new-student account with onboarding not started', async () => {
    const [u] = await db.select().from(users).where(eq(users.email, 'newstudent@example.com'));
    expect(u).toMatchObject({ name: 'New Student', roles: ['student'] });
    expect(await db.select().from(preparationProfiles).where(eq(preparationProfiles.userId, u.id))).toEqual([]);
  });

  it('adds the six practice subject nodes under prelims-gs-1', async () => {
    const nodes = await db.select().from(syllabusNodes);
    const parent = nodes.find((n) => n.slug === 'prelims-gs-1');
    const kids = nodes.filter((n) => n.parentId === parent?.id);
    expect(kids.map((n) => n.slug).sort()).toEqual(
      ['prelims-economy', 'prelims-environment', 'prelims-geography', 'prelims-history', 'prelims-polity', 'prelims-science-technology'],
    );
    for (const k of kids) expect(k).toMatchObject({ level: 3, examStage: 'prelims', paper: 'GS Paper I', status: 'published' });
  });

  it('points each catalog subject at its own Prelims syllabus node (one node per subject)', async () => {
    const nodes = await db.select().from(syllabusNodes);
    const slugOf = new Map(nodes.map((n) => [n.id, n.slug]));
    const subs = await db.select().from(subjects);
    const map = Object.fromEntries(subs.map((s) => [s.slug, slugOf.get(s.syllabusNodeId)]));
    expect(map).toEqual({
      'indian-polity': 'prelims-polity',
      history: 'prelims-history',
      geography: 'prelims-geography',
      economy: 'prelims-economy',
      environment: 'prelims-environment',
      'science-technology': 'prelims-science-technology',
      ethics: 'mains-gs-4',
      csat: 'prelims-csat',
    });
    expect(new Set(subs.map((s) => s.syllabusNodeId)).size).toBe(subs.length);
    // Display field is unchanged.
    expect(subs.find((s) => s.slug === 'indian-polity')?.gsPaper).toBe('GS II');
  });

  it('seeds 100 platform-sample questions across the 7 practice nodes', async () => {
    const qs = await db.select().from(questions);
    expect(qs).toHaveLength(100);
    expect(qs.every((q) => q.status === 'published' && q.verificationStatus === 'platform_sample' && q.sourceType === 'platform')).toBe(true);
    expect(qs.every((q) => q.pyqYear === null && q.pyqPaper === null)).toBe(true);
    const nodes = await db.select().from(syllabusNodes);
    const slugOf = new Map(nodes.map((n) => [n.id, n.slug]));
    const by: Record<string, number> = {};
    for (const q of qs) by[slugOf.get(q.subjectNodeId) as string] = (by[slugOf.get(q.subjectNodeId) as string] ?? 0) + 1;
    expect(by).toEqual({
      'prelims-polity': 20,
      'prelims-history': 15,
      'prelims-geography': 15,
      'prelims-economy': 15,
      'prelims-environment': 15,
      'prelims-science-technology': 10,
      'prelims-csat': 10,
    });
  });

  it('updates a question in place when its stem changes (no duplicates)', async () => {
    const [q] = await db.select().from(questions).limit(1);
    await db.update(questions).set({ stem: 'tampered' }).where(eq(questions.id, q.id));
    await runSeed(db, opts);
    expect(await db.select().from(questions)).toHaveLength(100);
    const [after] = await db.select().from(questions).where(eq(questions.id, q.id));
    expect(after.stem).not.toBe('tampered');
  });

  it('seeds the demo planner data for the student', async () => {
    const [s] = await db.select().from(users).where(eq(users.email, 'student@example.com'));
    expect(await db.select().from(preparationProfiles).where(eq(preparationProfiles.userId, s.id))).toMatchObject([
      { onboardingStatus: 'completed', targetYear: 2027, stage: 'preparing' },
    ]);
    expect(await db.select().from(goals).where(eq(goals.userId, s.id))).toMatchObject([
      { dailyMin: 240, weeklyMin: 1680, monthlyMilestone: 'Finish Polity foundations' },
    ]);
    const ts = await db.select().from(tasks).where(eq(tasks.userId, s.id));
    expect(ts).toHaveLength(8);
    expect(ts.every((t) => t.source === 'seed')).toBe(true);
    expect(ts.filter((t) => t.status === 'completed')).toHaveLength(2);
    expect(ts.filter((t) => t.scheduledStart === null)).toHaveLength(2);
    expect(await db.select().from(studySessions).where(eq(studySessions.userId, s.id))).toHaveLength(5);
    const ps = await db.select().from(sessions).where(eq(sessions.userId, s.id));
    expect(ps).toHaveLength(3);
    expect(ps.every((p) => p.status === 'submitted')).toBe(true);
    expect(ps.filter((p) => p.mode === 'test' && p.score !== null)).toHaveLength(1);
    expect(ps.filter((p) => p.mode === 'learning' && p.score === null)).toHaveLength(2);
    expect(await db.select().from(bookmarks).where(eq(bookmarks.userId, s.id))).toHaveLength(3);
    const ex = await db.select().from(examDates);
    expect(ex.map((e) => [e.exam, e.year, e.status]).sort()).toEqual([
      ['mains', 2027, 'illustrative'],
      ['prelims', 2027, 'illustrative'],
    ]);
  });

  it('builds the mistake notebook exactly as the practice engine would from the seeded answers', async () => {
    const [s] = await db.select().from(users).where(eq(users.email, 'student@example.com'));
    const answers = await db
      .select({
        questionId: sessionQuestions.questionId,
        selected: sessionQuestions.selected,
        correct: sessionQuestions.correct,
        confidence: sessionQuestions.confidence,
        submittedAt: sessions.submittedAt,
        ordinal: sessionQuestions.ordinal,
      })
      .from(sessionQuestions)
      .innerJoin(sessions, eq(sessions.id, sessionQuestions.sessionId))
      .where(eq(sessions.userId, s.id));
    answers.sort((a, b) => (a.submittedAt as Date).getTime() - (b.submittedAt as Date).getTime() || a.ordinal - b.ordinal);
    type E = { reason: string; timesWrong: number; firstSeen: number; lastSeen: number; resolvedAt: number | null };
    const want = new Map<string, E>();
    for (const a of answers) {
      if (a.selected === null || a.correct === null) continue;
      const at = (a.submittedAt as Date).getTime();
      const e = want.get(a.questionId);
      if (!a.correct) {
        if (e) Object.assign(e, { reason: 'incorrect', timesWrong: e.timesWrong + 1, lastSeen: at, resolvedAt: null });
        else want.set(a.questionId, { reason: 'incorrect', timesWrong: 1, firstSeen: at, lastSeen: at, resolvedAt: null });
      } else if (a.confidence === 'guess') {
        if (!e) want.set(a.questionId, { reason: 'guessed', timesWrong: 1, firstSeen: at, lastSeen: at, resolvedAt: null });
      } else if (e && e.resolvedAt === null) e.resolvedAt = at;
    }
    const got = await db.select().from(mistakeEntries).where(eq(mistakeEntries.userId, s.id));
    const norm = new Map(
      got.map((g) => [
        g.questionId,
        { reason: g.reason, timesWrong: g.timesWrong, firstSeen: g.firstSeen.getTime(), lastSeen: g.lastSeen.getTime(), resolvedAt: g.resolvedAt?.getTime() ?? null },
      ]),
    );
    expect(want.size).toBeGreaterThanOrEqual(3);
    expect(norm).toEqual(want);
    expect([...want.values()].some((e) => e.timesWrong === 2)).toBe(true);
    expect([...want.values()].some((e) => e.resolvedAt !== null)).toBe(true);
  });

  it('keeps every seeded practice session internally consistent', async () => {
    const [s] = await db.select().from(users).where(eq(users.email, 'student@example.com'));
    for (const p of await db.select().from(sessions).where(eq(sessions.userId, s.id))) {
      const rows = await db.select().from(sessionQuestions).where(eq(sessionQuestions.sessionId, p.id));
      const qs = await db.select().from(questions);
      const key = new Map(qs.map((q) => [q.id, q.correctOption]));
      expect((p.correctCount ?? 0) + (p.incorrectCount ?? 0) + (p.skippedCount ?? 0)).toBe(rows.length);
      expect((p.summary?.byTopic ?? []).reduce((n, t) => n + t.total, 0)).toBe(rows.length);
      const scored = scoreAnswers(rows.map((r) => ({ selected: r.selected, correctOption: key.get(r.questionId) as string })), p.marking, p.mode);
      expect(p.correctCount).toBe(scored.correct);
      expect(p.incorrectCount).toBe(scored.incorrect);
      expect(p.skippedCount).toBe(scored.skipped);
      expect(Number(p.accuracy)).toBeCloseTo(scored.accuracy, 10);
      expect(p.score === null ? null : Number(p.score)).toBe(scored.score);
    }
  });

  it('gives the default free plan an entitlement for every feature key', async () => {
    const [free] = await db.select().from(plans).where(eq(plans.key, 'free'));
    expect(free.isDefault).toBe(true);
    const ents = await db.select().from(planEntitlements).where(eq(planEntitlements.planId, free.id));
    expect(ents.map((e) => e.featureKey).sort()).toEqual([...FEATURE_KEYS].sort());
    expect(ents.every((e) => e.enabled)).toBe(true);
    const ask = ents.find((e) => e.featureKey === 'ai.ask.message');
    expect(ask).toMatchObject({ limitValue: 50, period: 'day' });
    expect((await db.select().from(featureCatalog)).length).toBe(FEATURE_KEYS.length);
    for (const key of ['planner.basic', 'study.session', 'practice.session', 'practice.pyq', 'practice.mistake_notebook']) {
      const e = ents.find((x) => x.featureKey === key);
      expect(e).toMatchObject({ enabled: true, limitValue: null, period: 'none' });
    }
  });

  it('FakeAuthAdmin returns the same subject for the same email', async () => {
    const a = new FakeAuthAdmin();
    const i = { email: 'x@example.com', password: 'p', name: 'X' };
    expect((await a.ensureUser(i)).subject).toBe((await a.ensureUser(i)).subject);
    expect(a.calls).toHaveLength(2);
  });
});

describe('runSeed when the auth admin refuses a user', () => {
  it('aborts before any user or role is written', async () => {
    const { db, close } = await createTestDb();
    try {
      const fake = new FakeAuthAdmin();
      const authAdmin: AuthAdmin = {
        ensureUser: async (i) => {
          if (i.email === 'admin@example.com') throw new Error('admin@example.com: not created by the seed');
          return fake.ensureUser(i);
        },
      };
      await expect(runSeed(db, { demoPassword: 'test-password-1', authAdmin })).rejects.toThrow(/not created by the seed/);
      const rows = await db.select().from(users);
      expect(rows).toEqual([]);
    } finally {
      await close();
    }
  });
});

describe('seedPlanner without the student account', () => {
  it('refuses with a clear error', async () => {
    const { db, close } = await createTestDb();
    try {
      await expect(seedPlanner(db, { demoPassword: 'x', authAdmin: new FakeAuthAdmin() })).rejects.toThrow(
        /student@example\.com.*seed-identity/,
      );
    } finally {
      await close();
    }
  });
});

describe('seedQuestions atomicity', () => {
  it('aborts with zero writes when any row is invalid', async () => {
    const { db, close } = await createTestDb();
    try {
      const [first, second] = loadQuestions();
      const ctx = { demoPassword: 'x', authAdmin: new FakeAuthAdmin() };
      await expect(seedQuestions(db, ctx, [first, { ...second, stem: '' } as QuestionSeed])).rejects.toThrow(/questions\.json/);
      expect(await db.select().from(questions)).toEqual([]);
    } finally {
      await close();
    }
  });
});

describe('runSeed early in the IST morning', () => {
  it('never completes a task before it was scheduled', async () => {
    const { db, close } = await createTestDb();
    try {
      // 02:30 IST on 30 October: before the earliest "today" slot.
      const now = new Date('2026-10-29T21:00:00Z');
      await runSeed(db, { demoPassword: 'test-password-1', authAdmin: new FakeAuthAdmin(), now });
      const done = (await db.select().from(tasks)).filter((t) => t.status === 'completed');
      expect(done).toHaveLength(2);
      for (const t of done) {
        expect((t.completedAt as Date).getTime()).toBeGreaterThanOrEqual((t.scheduledStart as Date).getTime());
        expect((t.completedAt as Date).getTime()).toBeLessThanOrEqual(now.getTime());
      }
    } finally {
      await close();
    }
  });
});
