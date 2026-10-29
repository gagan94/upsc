import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { dayRange, localDateOf } from '../common/dates';
import { AppError } from '../common/errors';
import { parse } from '../common/validation';
import { ACTIVITY_TYPES, PRIORITIES } from '../db/schema/planner';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentUser } from '../identity/decorators';
import type { UserView } from '../identity/users.service';
import { PreparationService } from '../me/preparation.service';
import { TasksService } from './tasks.service';

const dateISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'Invalid date');
const instant = z
  .string()
  .datetime({ offset: true })
  .transform((s) => new Date(s));
const uuid = z.string().uuid();

const linked = z.object({
  type: z.enum(['practice_set', 'lesson', 'note']),
  id: z.string().max(100).optional(),
  href: z.string().max(500).optional(),
});

const taskFields = {
  title: z.string().trim().min(1).max(200),
  subjectNodeId: uuid.nullable().optional(),
  activityType: z.enum(ACTIVITY_TYPES).optional(),
  durationMin: z.number().int().min(5).max(720).nullable().optional(),
  scheduledStart: instant.nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  linked: linked.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
};
const createSchema = z.object(taskFields);
const patchSchema = z.object(taskFields).partial();
const completeSchema = z.object({ actualMin: z.number().int().min(0).max(1440).optional() });
const rescheduleSchema = z.object({ scheduledStart: instant.nullable() });
const todaySchema = z.object({ date: dateISO.optional() });
const rangeSchema = z.object({ from: dateISO, to: dateISO });
const idSchema = z.object({ id: uuid });

const MAX_RANGE_DAYS = 42;
const OVERLOAD_ABSOLUTE_MIN = 720;

const notFound = () => new AppError(404, 'not_found', 'Task not found');
/** A malformed id can never match a row; answer like any other unknown id. */
const taskId = (raw: string): string => {
  const r = idSchema.safeParse({ id: raw });
  if (!r.success) throw notFound();
  return r.data.id;
};

@Controller('planner')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly prep: PreparationService,
  ) {}

  @Get('today')
  async today(@CurrentUser() user: UserView, @Query() query: unknown) {
    const { date: given } = parse(todaySchema, query);
    const date = given ?? localDateOf(new Date(), user.timezone);
    const { start, end } = dayRange(date, user.timezone);
    const [dayTasks, overdue, unscheduledCount, prefs] = await Promise.all([
      this.tasks.list(user.id, { from: start, to: end }),
      this.tasks.overdue(user.id, start),
      this.tasks.unscheduledCount(user.id),
      this.prep.getPreferences(user.id),
    ]);
    const plannedMin = dayTasks.filter((t) => t.status !== 'skipped').reduce((s, t) => s + (t.durationMin ?? 0), 0);
    return {
      date,
      tasks: dayTasks,
      overdue,
      stats: {
        plannedMin,
        recordedMin: 0, // wired in Task 4
        completed: dayTasks.filter((t) => t.status === 'completed').length,
        total: dayTasks.length,
      },
      unscheduledCount,
      overloaded: plannedMin > prefs.dailyGoalMin * 1.25 || plannedMin > OVERLOAD_ABSOLUTE_MIN,
    };
  }

  @Get('range')
  async range(@CurrentUser() user: UserView, @Query() query: unknown) {
    const { from, to } = parse(rangeSchema, query);
    const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;
    if (days < 1) throw new AppError(400, 'validation_failed', 'to must not be before from');
    if (days > MAX_RANGE_DAYS) throw new AppError(400, 'validation_failed', `Range may not exceed ${MAX_RANGE_DAYS} days`);
    const tz = user.timezone;
    return { tasks: await this.tasks.list(user.id, { from: dayRange(from, tz).start, to: dayRange(to, tz).end }) };
  }

  @Get('unscheduled')
  async unscheduled(@CurrentUser() user: UserView) {
    return { tasks: await this.tasks.unscheduled(user.id) };
  }

  @Post('tasks')
  async create(@CurrentUser() user: UserView, @Body() body: unknown) {
    return { task: await this.tasks.create(user.id, parse(createSchema, body)) };
  }

  @Get('tasks/:id')
  async get(@CurrentUser() user: UserView, @Param('id') id: string) {
    return { task: await this.tasks.get(user.id, taskId(id)) };
  }

  @Patch('tasks/:id')
  async patch(@CurrentUser() user: UserView, @Param('id') id: string, @Body() body: unknown) {
    const tid = taskId(id);
    return { task: await this.tasks.update(user.id, tid, parse(patchSchema, body)) };
  }

  @Delete('tasks/:id')
  @HttpCode(204)
  async remove(@CurrentUser() user: UserView, @Param('id') id: string): Promise<void> {
    await this.tasks.softDelete(user.id, taskId(id));
  }

  @Post('tasks/:id/complete')
  @HttpCode(200)
  async complete(@CurrentUser() user: UserView, @Param('id') id: string, @Body() body: unknown) {
    const tid = taskId(id);
    return { task: await this.tasks.complete(user.id, tid, parse(completeSchema, body ?? {})) };
  }

  @Post('tasks/:id/skip')
  @HttpCode(200)
  async skip(@CurrentUser() user: UserView, @Param('id') id: string) {
    return { task: await this.tasks.skip(user.id, taskId(id)) };
  }

  @Post('tasks/:id/reschedule')
  @HttpCode(200)
  async reschedule(@CurrentUser() user: UserView, @Param('id') id: string, @Body() body: unknown) {
    const tid = taskId(id);
    return { task: await this.tasks.reschedule(user.id, tid, parse(rescheduleSchema, body)) };
  }
}
