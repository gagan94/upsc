import { DynamicModule, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { AppConfig } from '../common/config';
import * as schema from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<any, any, any>;
export const DB = Symbol('DB');
const POOL = Symbol('POOL');

export function createPool(databaseUrl: string): Pool {
  const ssl = databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require');
  return new Pool({ connectionString: databaseUrl, ssl: ssl ? { rejectUnauthorized: false } : undefined });
}

@Module({})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly pool: Pool | null) {}

  /** Pass `existing` (e.g. a test database) to skip creating a pool. */
  static forRoot(config: AppConfig, existing?: Db): DynamicModule {
    return {
      module: DbModule,
      global: true,
      providers: existing
        ? [
            { provide: POOL, useValue: null },
            // factory (not useValue): Nest stringifies module metadata and a db object is circular
            { provide: DB, useFactory: (): Db => existing },
          ]
        : [
            { provide: POOL, useFactory: () => createPool(config.databaseUrl) },
            { provide: DB, inject: [POOL], useFactory: (pool: Pool): Db => drizzle(pool, { schema }) },
          ],
      exports: [DB],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool?.end();
  }
}
