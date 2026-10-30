import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { EntitlementGuard } from '../billing/entitlement.guard';
import { RequiresEntitlement } from '../billing/requires-entitlement.decorator';
import { AppError } from '../common/errors';
import { parse } from '../common/validation';
import { CONFIDENCE_LEVELS, OPTION_KEYS, PRACTICE_SOURCES, SESSION_MODES } from '../db/schema/practice';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentUser } from '../identity/decorators';
import type { UserView } from '../identity/users.service';
import { SessionsService } from './sessions.service';

const uuid = z.string().uuid();
const subjectNodeIds = z.array(uuid).min(1).max(10).transform((ids) => [...new Set(ids)]);
const count = z.number().int().min(5).max(50);

const createSchema = z.object({
  subjectNodeIds,
  source: z.enum(PRACTICE_SOURCES),
  count,
  mode: z.enum(SESSION_MODES),
  timed: z.boolean(),
});
const availabilitySchema = z.object({
  subjects: z.string().transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)).pipe(subjectNodeIds),
  source: z.enum(PRACTICE_SOURCES),
  count: z.coerce.number().pipe(count),
});
const answerSchema = z.object({
  selected: z.enum(OPTION_KEYS).nullable().optional(),
  flagged: z.boolean().optional(),
  confidence: z.enum(CONFIDENCE_LEVELS).nullable().optional(),
  timeMsDelta: z.number().int().min(0).max(600_000).optional(),
});

/** A malformed id can never match a row; answer like any other unknown id. */
const sessionId = (raw: string): string => {
  const r = uuid.safeParse(raw);
  if (!r.success) throw new AppError(404, 'not_found', 'Practice session not found');
  return r.data;
};
const ordinalOf = (raw: string): number => {
  if (!/^[1-9]\d{0,2}$/.test(raw)) throw new AppError(404, 'not_found', 'Question not found in this session');
  return Number(raw);
};

@Controller('practice')
@UseGuards(AuthGuard)
export class PracticeController {
  constructor(private readonly sessions: SessionsService) {}

  @Get('subjects')
  async subjects() {
    return { subjects: await this.sessions.subjects() };
  }

  @Get('availability')
  availability(@CurrentUser() user: UserView, @Query() query: unknown) {
    const q = parse(availabilitySchema, query);
    return this.sessions.availability(user.id, { subjectNodeIds: q.subjects, source: q.source, count: q.count });
  }

  @Post('sessions')
  @UseGuards(EntitlementGuard)
  @RequiresEntitlement('practice.session')
  create(@CurrentUser() user: UserView, @Body() body: unknown) {
    return this.sessions.create(user.id, parse(createSchema, body));
  }

  @Get('sessions/:id')
  get(@CurrentUser() user: UserView, @Param('id') id: string) {
    return this.sessions.get(user.id, sessionId(id));
  }

  @Put('sessions/:id/answers/:ordinal')
  answer(@CurrentUser() user: UserView, @Param('id') id: string, @Param('ordinal') ordinal: string, @Body() body: unknown) {
    const sid = sessionId(id);
    const ord = ordinalOf(ordinal);
    return this.sessions.answer(user.id, sid, ord, parse(answerSchema, body ?? {}));
  }

  @Post('sessions/:id/submit')
  @HttpCode(200)
  submit(@CurrentUser() user: UserView, @Param('id') id: string) {
    return this.sessions.submit(user.id, sessionId(id));
  }

  @Get('sessions/:id/results')
  results(@CurrentUser() user: UserView, @Param('id') id: string) {
    return this.sessions.results(user.id, sessionId(id));
  }
}
