import { drizzle } from 'drizzle-orm/node-postgres';
import { createPool } from '../db/db.module';
import * as schema from '../db/schema';
import { SupabaseAuthAdmin } from './auth-admin';
import { runSeed } from './run-seed';

async function main(): Promise<void> {
  const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DEMO_PASSWORD'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Refusing to seed with NODE_ENV=production (set SEED_ALLOW_PRODUCTION=true to override)');
  }
  if (process.env.SEED_ALLOW_PRODUCTION === 'true') {
    console.warn('WARNING: SEED_ALLOW_PRODUCTION=true: creating demo users with a known password (DEMO_PASSWORD).');
  }
  const pool = createPool(process.env.DATABASE_URL as string);
  try {
    const authAdmin = new SupabaseAuthAdmin({
      url: process.env.SUPABASE_URL as string,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    });
    const report = await runSeed(drizzle(pool, { schema }), { demoPassword: process.env.DEMO_PASSWORD as string, authAdmin });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
