import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { dateISO, parse } from '../common/validation';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentUser } from '../identity/decorators';
import type { UserView } from '../identity/users.service';
import { GoalsService } from './goals.service';

const MAX_DAILY_MIN = 1440;
const MAX_WEEKLY_MIN = 10080;

const goalsSchema = z.object({
  dailyMin: z.number().int().min(1).max(MAX_DAILY_MIN).optional(),
  weeklyMin: z.number().int().min(1).max(MAX_WEEKLY_MIN).optional(),
  monthlyMilestone: z.string().trim().max(200).nullable().optional(),
  milestoneDate: dateISO.nullable().optional(),
  subjectTargets: z
    .array(z.object({ subjectNodeId: z.string().uuid(), weeklyMin: z.number().int().min(1).max(MAX_WEEKLY_MIN) }))
    .max(50)
    .refine((a) => new Set(a.map((t) => t.subjectNodeId)).size === a.length, 'Duplicate subjectNodeId')
    .optional(),
});
const progressSchema = z.object({ week: dateISO.optional() });

@Controller('planner')
@UseGuards(AuthGuard)
export class PlannerController {
  constructor(private readonly goals: GoalsService) {}

  @Get('goals')
  async getGoals(@CurrentUser() user: UserView) {
    return { goals: await this.goals.getGoals(user.id) };
  }

  @Put('goals')
  async putGoals(@CurrentUser() user: UserView, @Body() body: unknown) {
    return { goals: await this.goals.putGoals(user.id, parse(goalsSchema, body)) };
  }

  @Get('progress')
  progress(@CurrentUser() user: UserView, @Query() query: unknown) {
    const { week } = parse(progressSchema, query);
    return this.goals.progress(user.id, user.timezone, week);
  }

  @Get('exam-dates')
  async examDates() {
    return { examDates: await this.goals.listExamDates() };
  }
}
