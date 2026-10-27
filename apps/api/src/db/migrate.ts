import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'path';
import { createPool } from './db.module';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const pool = createPool(url);
  await migrate(drizzle(pool), { migrationsFolder: join(__dirname, '../../drizzle') });
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
