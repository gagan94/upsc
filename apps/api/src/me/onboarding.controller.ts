import { Body, Controller, Get, HttpCode, Post, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parse } from '../common/validation';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentUser } from '../identity/decorators';
import type { UserView } from '../identity/users.service';
import { OnboardingService } from './onboarding.service';

const answersSchema = z.object({
  targetYear: z.union([z.literal(2027), z.literal(2028), z.null()]).optional(),
  stage: z.enum(['beginner', 'preparing', 'revision']).optional(),
  attempt: z.string().trim().max(40).nullable().optional(),
  focus: z
    .object({
      papers: z.enum(['prelims', 'mains', 'both']).optional(),
      subjects: z.array(z.string().max(60)).max(30).optional(),
    })
    .optional(),
  routine: z
    .object({
      dailyMin: z.number().int().min(30).max(960),
      weeklyMin: z.number().int().min(30).max(6720),
      windows: z.array(z.enum(['morning', 'afternoon', 'evening', 'night'])).max(4),
    })
    .refine((r) => r.dailyMin <= r.weeklyMin, { message: 'dailyMin cannot exceed weeklyMin' })
    .optional(),
  support: z.array(z.string().max(60)).max(20).optional(),
});

const saveSchema = z.object({
  step: z.number().int().min(0).max(5),
  answers: answersSchema.default({}),
  status: z.enum(['in_progress', 'skipped']).optional(),
});
const completeSchema = z.object({ acceptPlan: z.boolean() });

@Controller('me/onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  get(@CurrentUser() user: UserView) {
    return this.onboarding.get(user.id);
  }

  @Put()
  save(@CurrentUser() user: UserView, @Body() body: unknown) {
    return this.onboarding.save(user.id, parse(saveSchema, body));
  }

  @Post('plan-preview')
  @HttpCode(200)
  preview(@CurrentUser() user: UserView) {
    return this.onboarding.preview(user.id, user.timezone);
  }

  @Post('complete')
  @HttpCode(200)
  complete(@CurrentUser() user: UserView, @Body() body: unknown) {
    return this.onboarding.complete(user.id, user.timezone, parse(completeSchema, body).acceptPlan);
  }
}
