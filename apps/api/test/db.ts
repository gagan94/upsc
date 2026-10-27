import { sql } from 'drizzle-orm';
import { join } from 'path';
import type { Db } from '../src/db/db.module';

const migrationsFolder = join(__dirname, '../drizzle');

/**
 * Test database with all migrations applied. Uses TEST_DATABASE_URL (fresh
 * schemas per run) when set, otherwise an in-process PGlite instance.
 */
export async function createTestDb(): Promise<{ db: Db; close(): Promise<void> }> {
  const url = process.env.TEST_DATABASE_URL;
  if (url) {
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const { createPool } = await import('../src/db/db.module');
    const pool = createPool(url);
    const db = drizzle(pool);
    await db.execute(sql`DROP SCHEMA IF EXISTS identity CASCADE`);
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await migrate(db, { migrationsFolder });
    return { db: db as unknown as Db, close: () => pool.end() };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder });
  return { db: db as unknown as Db, close: () => client.close() };
}
