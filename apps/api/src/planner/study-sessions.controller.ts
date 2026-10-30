import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { EntitlementGuard } from '../billing/entitlement.guard';
import { RequiresEntitlement } from '../billing/requires-entitlement.decorator';
import { dayRange } from '../common/dates';
import { AppError } from '../common/errors';
import { dateISO, parse } from '../common/validation';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentUser } from '../identity/decorators';
import type { UserView } from '../identity/users.service';
import { StudySessionsService } from './study-sessions.service';

const uuid = z.string().uuid();

const startSchema = z.object({
  plannedMin: z.number().int().min(5).max(240),
  taskId: uuid.optional(),
  subjectNodeId: uuid.optional(),
});
const heartbeatSchema = z.object({ interacted: z.boolean() });
const endSchema = z.object({
  focusRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  completeTask: z.boolean().optional(),
});
const recoverSchema = z.object({ action: z.enum(['resume', 'end', 'discard']) });
const listSchema = z.object({
  from: dateISO.optional(),
  to: dateISO.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** A malformed id can never match a row; answer like any other unknown id. */
const sessionId = (raw: string): string => {
  const r = uuid.safeParse(raw);
  if (!r.success) throw new AppError(404, 'not_found', 'Study session not found');
  return r.data;
};

@Controller('study-sessions')
@UseGuards(AuthGuard)
export class StudySessionsController {
  constructor(private readonly sessions: StudySessionsService) {}

  @Post()
  @UseGuards(EntitlementGuard)
  @RequiresEntitlement('study.session')
  async start(@CurrentUser() user: UserView, @Body() body: unknown) {
    return { session: await this.sessions.start(user.id, parse(startSchema, body)) };
  }

  @Get('active')
  async active(@CurrentUser() user: UserView) {
    return { session: await this.sessions.active(user.id) };
  }

  @Get()
  async list(@CurrentUser() user: UserView, @Query() query: unknown) {
    const q = parse(listSchema, query);
    const tz = user.timezone;
    return {
      sessions: await this.sessions.list(user.id, {
        from: q.from ? dayRange(q.from, tz).start : undefined,
        to: q.to ? dayRange(q.to, tz).end : undefined,
        limit: q.limit,
      }),
    };
  }

  @Post(':id/heartbeat')
  @HttpCode(200)
  async heartbeat(@CurrentUser() user: UserView, @Param('id') id: string, @Body() body: unknown) {
    const sid = sessionId(id);
    const { interacted } = parse(heartbeatSchema, body ?? {});
    return { session: await this.sessions.heartbeat(user.id, sid, interacted) };
  }

  @Post(':id/pause')
  @HttpCode(200)
  async pause(@CurrentUser() user: UserView, @Param('id') id: string) {
    return { session: await this.sessions.pause(user.id, sessionId(id)) };
  }

  @Post(':id/resume')
  @HttpCode(200)
  async resume(@CurrentUser() user: UserView, @Param('id') id: string) {
    return { session: await this.sessions.resume(user.id, sessionId(id)) };
  }

  @Post(':id/end')
  @HttpCode(200)
  async end(@CurrentUser() user: UserView, @Param('id') id: string, @Body() body: unknown) {
    const sid = sessionId(id);
    return { session: await this.sessions.end(user.id, sid, parse(endSchema, body ?? {})) };
  }

  @Post(':id/discard')
  @HttpCode(200)
  async discard(@CurrentUser() user: UserView, @Param('id') id: string) {
    return { session: await this.sessions.discard(user.id, sessionId(id)) };
  }

  @Post(':id/recover')
  @HttpCode(200)
  async recover(@CurrentUser() user: UserView, @Param('id') id: string, @Body() body: unknown) {
    const sid = sessionId(id);
    const { action } = parse(recoverSchema, body ?? {});
    return { session: await this.sessions.recover(user.id, sid, action) };
  }
}
