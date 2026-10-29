import { eq } from 'drizzle-orm';
import { createTestDb } from '../../test/db';
import { newId } from './ids';
import { profiles, users } from './schema';
import type { Db } from './db.module';

describe('identity schema', () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
  });
  afterAll(() => close());

  const mk = (over: Partial<typeof users.$inferInsert> = {}) => ({
    id: newId(),
    authSubject: newId(),
    email: `${newId()}@example.com`,
    name: 'N',
    ...over,
  });

  it('rejects emails that differ only by case', async () => {
    await db.insert(users).values(mk({ email: 'alice@example.com' }));
    await expect(db.insert(users).values(mk({ email: 'Alice@Example.com' }))).rejects.toThrow();
  });

  it('rejects duplicate (authProvider, authSubject)', async () => {
    await db.insert(users).values(mk({ authSubject: 'dup' }));
    await expect(db.insert(users).values(mk({ authSubject: 'dup' }))).rejects.toThrow();
  });

  it('applies defaults', async () => {
    const u = mk();
    await db.insert(users).values(u);
    const [row] = await db.select().from(users).where(eq(users.id, u.id));
    expect(row.roles).toEqual(['student']);
    expect(row.timezone).toBe('Asia/Kolkata');
    expect(row.locale).toBe('en');
    expect(row.authProvider).toBe('supabase');
    expect(row.status).toBe('active');
  });

  it('rejects a profile for a missing user', async () => {
    await expect(
      db.insert(profiles).values({ userId: newId(), displayName: 'x' }),
    ).rejects.toThrow();
  });
});
