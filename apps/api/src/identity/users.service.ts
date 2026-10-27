import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ne, sql } from 'drizzle-orm';
import { AppError } from '../common/errors';
import { DB, Db } from '../db/db.module';
import { newId } from '../db/ids';
import { profiles, users } from '../db/schema';
import type { AuthClaims } from './token-verifier';

export interface UserView {
  id: string;
  email: string;
  name: string;
  roles: string[];
  timezone: string;
  locale: string;
}

const LOGIN_TOUCH_MS = 5 * 60 * 1000;
const PROVIDER = 'supabase';

type Row = typeof users.$inferSelect;
const view = (r: Row): UserView => ({
  id: r.id,
  email: r.email,
  name: r.name,
  roles: r.roles,
  timezone: r.timezone,
  locale: r.locale,
});

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async resolve(claims: AuthClaims): Promise<UserView> {
    const email = claims.email.trim().toLowerCase();
    const name = claims.name?.trim() || email.split('@')[0];

    return this.db.transaction(async (tx) => {
      const find = async () =>
        (
          await tx
            .select()
            .from(users)
            .where(and(eq(users.authProvider, PROVIDER), eq(users.authSubject, claims.sub)))
            .limit(1)
        )[0];

      let row = await find();
      if (!row) {
        const id = newId();
        const inserted = await tx
          .insert(users)
          .values({ id, authProvider: PROVIDER, authSubject: claims.sub, email, name, roles: ['student'] })
          .onConflictDoNothing()
          .returning({ id: users.id });
        if (inserted.length > 0) {
          await tx
            .insert(profiles)
            .values({ userId: id, displayName: name })
            .onConflictDoNothing();
        }
        row = await find();
        if (!row) throw new AppError(409, 'email_conflict', 'This email belongs to another account');
      }

      const now = new Date();
      const patch: Partial<typeof users.$inferInsert> = {};
      if (!row.lastLoginAt || now.getTime() - row.lastLoginAt.getTime() > LOGIN_TOUCH_MS) {
        patch.lastLoginAt = now;
      }
      if (row.email !== email) {
        const clash = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(sql`lower(${users.email}) = ${email}`, ne(users.id, row.id)))
          .limit(1);
        if (clash.length === 0) patch.email = email;
      }
      if (Object.keys(patch).length > 0) {
        const [updated] = await tx.update(users).set(patch).where(eq(users.id, row.id)).returning();
        row = updated;
      }
      return view(row);
    });
  }
}
