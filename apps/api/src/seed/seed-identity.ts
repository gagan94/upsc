import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/db.module';
import { profiles, users } from '../db/schema';
import type { SeedContext } from './run-seed';
import { seedId } from './ids';

export const DEMO_USERS = [
  { email: 'student@example.com', name: 'Vinayaka', roles: ['student'] },
  { email: 'admin@example.com', name: 'Admin', roles: ['admin'] },
] as const;

export async function seedIdentity(db: Db, ctx: SeedContext): Promise<void> {
  for (const u of DEMO_USERS) {
    const { subject } = await ctx.authAdmin.ensureUser({ email: u.email, password: ctx.demoPassword, name: u.name });
    // A row may already exist (e.g. provisioned at first login) under a different id: update it in place.
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${u.email} or (${users.authProvider} = 'supabase' and ${users.authSubject} = ${subject})`);
    const id = existing?.id ?? seedId(`user:${u.email}`);
    const values = { authProvider: 'supabase', authSubject: subject, email: u.email, name: u.name, roles: [...u.roles] };
    await db.insert(users).values({ id, ...values }).onConflictDoUpdate({ target: users.id, set: values });
    await db
      .insert(profiles)
      .values({ userId: id, displayName: u.name })
      .onConflictDoUpdate({ target: profiles.userId, set: { displayName: u.name } });
  }
}
