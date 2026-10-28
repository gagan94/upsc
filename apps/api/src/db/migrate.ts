import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'path';
import { createPool } from './db.module';

async function main(): Promise<void> {
  // Migrations prefer Neon's DIRECT (non-pooled) connection; the app itself uses the pooled DATABASE_URL.
  const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL (or DATABASE_URL_DIRECT) is required');
  const pool = createPool(url);
  await migrate(drizzle(pool), { migrationsFolder: join(__dirname, '../../drizzle') });
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
