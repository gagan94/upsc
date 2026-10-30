import { count, inArray } from 'drizzle-orm';
import type { Db } from '../db/db.module';
import { activities, examDates, lessons, modules, plans, questions, sessions, studySessions, subjects, tasks, users } from '../db/schema';
import type { AuthAdmin } from './auth-admin';
import { seedBilling, FREE_PLAN_KEY } from './seed-billing';
import { catalogIds, seedCatalog } from './seed-catalog';
import { DEMO_USERS, seedIdentity } from './seed-identity';
import { plannerIds, seedPlanner } from './seed-planner';
import { loadQuestions, questionId, seedQuestions } from './seed-questions';

export interface SeedContext {
  demoPassword: string;
  authAdmin: AuthAdmin;
  /** Clock for the demo planner data (tests pin it); defaults to the current time. */
  now?: Date;
}
export type Seeder = (db: Db, ctx: SeedContext) => Promise<void>;

export interface SeedReport {
  users: number;
  plans: number;
  subjects: number;
  modules: number;
  activities: number;
  lessons: number;
  questions: number;
  tasks: number;
  sessions: number;
  practiceSessions: number;
  examDates: number;
}

/** Order matters (questions need the catalog nodes; the planner needs users and questions). Later phases add seeders here. */
export const SEEDERS: Seeder[] = [seedIdentity, seedBilling, seedCatalog, seedQuestions, seedPlanner];

export async function runSeed(db: Db, opts: SeedContext): Promise<SeedReport> {
  for (const seeder of SEEDERS) await seeder(db, opts);
  return report(db);
}

/** Rows that exist for what the seed owns (not rows inserted this run). */
async function report(db: Db): Promise<SeedReport> {
  const ids = catalogIds();
  const p = plannerIds();
  const n = async (q: Promise<{ c: number }[]>): Promise<number> => (await q)[0].c;
  return {
    users: await n(db.select({ c: count() }).from(users).where(inArray(users.email, DEMO_USERS.map((u) => u.email)))),
    plans: await n(db.select({ c: count() }).from(plans).where(inArray(plans.key, [FREE_PLAN_KEY]))),
    subjects: await n(db.select({ c: count() }).from(subjects).where(inArray(subjects.id, ids.subjects))),
    modules: await n(db.select({ c: count() }).from(modules).where(inArray(modules.id, ids.modules))),
    activities: await n(db.select({ c: count() }).from(activities).where(inArray(activities.id, ids.activities))),
    lessons: await n(db.select({ c: count() }).from(lessons).where(inArray(lessons.activityId, ids.lessons))),
    questions: await n(db.select({ c: count() }).from(questions).where(inArray(questions.id, loadQuestions().map((q) => questionId(q.slug))))),
    tasks: await n(db.select({ c: count() }).from(tasks).where(inArray(tasks.id, p.tasks))),
    sessions: await n(db.select({ c: count() }).from(studySessions).where(inArray(studySessions.id, p.studySessions))),
    practiceSessions: await n(db.select({ c: count() }).from(sessions).where(inArray(sessions.id, p.practiceSessions))),
    examDates: await n(db.select({ c: count() }).from(examDates).where(inArray(examDates.id, p.examDates))),
  };
}
