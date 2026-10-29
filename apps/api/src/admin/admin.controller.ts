import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { asc, inArray, sql } from 'drizzle-orm';
import { AppError } from '../common/errors';
import { DB, Db } from '../db/db.module';
import { planEntitlements, plans, users } from '../db/schema';
import { AuthGuard } from '../identity/auth.guard';
import { Roles } from '../identity/decorators';
import { RolesGuard } from '../identity/roles.guard';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Microsecond-precision UTC timestamp, as produced by the cursor query below.
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

function parseLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(Math.max(n, 1), MAX_LIMIT);
}

function decodeCursor(raw: string): { ts: string; id: string } {
  const bad = () => new AppError(400, 'invalid_cursor', 'Invalid cursor');
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) throw bad();
  const [ts, id, ...rest] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
  if (rest.length || !ts || !id || !TS_RE.test(ts) || !UUID_RE.test(id)) throw bad();
  return { ts, id };
}

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('users')
  async listUsers(@Query('limit') limitRaw?: string, @Query('cursor') cursorRaw?: string) {
    const limit = parseLimit(limitRaw);
    const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
    // Keyset on (created_at, id); the cursor carries created_at at full microsecond precision.
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        roles: users.roles,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        cursorTs: sql<string>`to_char(${users.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
      })
      .from(users)
      .where(cursor ? sql`(${users.createdAt}, ${users.id}) > (${cursor.ts}::timestamptz, ${cursor.id}::uuid)` : undefined)
      .orderBy(asc(users.createdAt), asc(users.id))
      .limit(limit + 1);
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > limit && last ? Buffer.from(`${last.cursorTs}|${last.id}`).toString('base64url') : null;
    return {
      users: page.map(({ cursorTs: _ts, ...u }) => u),
      nextCursor,
    };
  }

  @Get('plans')
  async listPlans() {
    const planRows = await this.db.select().from(plans).orderBy(asc(plans.key));
    const ents = planRows.length
      ? await this.db
          .select()
          .from(planEntitlements)
          .where(inArray(planEntitlements.planId, planRows.map((p) => p.id)))
          .orderBy(asc(planEntitlements.featureKey))
      : [];
    return {
      plans: planRows.map((p) => ({
        key: p.key,
        name: p.name,
        isDefault: p.isDefault,
        entitlements: ents
          .filter((e) => e.planId === p.id)
          .map((e) => ({ featureKey: e.featureKey, enabled: e.enabled, limitValue: e.limitValue, period: e.period })),
      })),
    };
  }
}
