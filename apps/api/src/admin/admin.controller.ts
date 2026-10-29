import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { asc, inArray } from 'drizzle-orm';
import { afterCursor, cursorTs, decodeCursor, encodeCursor, parseLimit } from '../common/cursor';
import { DB, Db } from '../db/db.module';
import { planEntitlements, plans, users } from '../db/schema';
import { AuthGuard } from '../identity/auth.guard';
import { Roles } from '../identity/decorators';
import { RolesGuard } from '../identity/roles.guard';

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
        cursorTs: cursorTs(users.createdAt),
      })
      .from(users)
      .where(afterCursor(users.createdAt, users.id, cursor))
      .orderBy(asc(users.createdAt), asc(users.id))
      .limit(limit + 1);
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > limit && last ? encodeCursor(last.cursorTs, last.id) : null;
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
