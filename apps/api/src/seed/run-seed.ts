import { count, inArray } from 'drizzle-orm';
import type { Db } from '../db/db.module';
import { activities, lessons, modules, plans, subjects, users } from '../db/schema';
import type { AuthAdmin } from './auth-admin';
import { seedBilling, FREE_PLAN_KEY } from './seed-billing';
import { catalogIds, seedCatalog } from './seed-catalog';
import { DEMO_USERS, seedIdentity } from './seed-identity';

export interface SeedContext {
  demoPassword: string;
  authAdmin: AuthAdmin;
}
export type Seeder = (db: Db, ctx: SeedContext) => Promise<void>;

export interface SeedReport {
  users: number;
  plans: number;
  subjects: number;
  modules: number;
  activities: number;
  lessons: number;
}

/** Order matters (billing/catalog have no dependency on users today). Later phases add seeders here. */
export const SEEDERS: Seeder[] = [seedIdentity, seedBilling, seedCatalog];

export async function runSeed(db: Db, opts: SeedContext): Promise<SeedReport> {
  for (const seeder of SEEDERS) await seeder(db, opts);
  return report(db);
}

/** Rows that exist for what the seed owns (not rows inserted this run). */
async function report(db: Db): Promise<SeedReport> {
  const ids = catalogIds();
  const n = async (q: Promise<{ c: number }[]>): Promise<number> => (await q)[0].c;
  return {
    users: await n(db.select({ c: count() }).from(users).where(inArray(users.email, DEMO_USERS.map((u) => u.email)))),
    plans: await n(db.select({ c: count() }).from(plans).where(inArray(plans.key, [FREE_PLAN_KEY]))),
    subjects: await n(db.select({ c: count() }).from(subjects).where(inArray(subjects.id, ids.subjects))),
    modules: await n(db.select({ c: count() }).from(modules).where(inArray(modules.id, ids.modules))),
    activities: await n(db.select({ c: count() }).from(activities).where(inArray(activities.id, ids.activities))),
    lessons: await n(db.select({ c: count() }).from(lessons).where(inArray(lessons.activityId, ids.lessons))),
  };
}
