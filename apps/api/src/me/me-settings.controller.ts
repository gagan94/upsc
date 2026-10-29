import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { parse } from '../common/validation';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentUser } from '../identity/decorators';
import type { UserView } from '../identity/users.service';
import { PreparationService } from './preparation.service';

const isValidTimezone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const patchMeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  bio: z.string().max(500).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  timezone: z.string().refine(isValidTimezone, 'Invalid IANA time zone').optional(),
});

const prepSchema = z.object({
  targetYear: z.union([z.literal(2027), z.literal(2028), z.null()]).optional(),
  stage: z.enum(['beginner', 'preparing', 'revision']).nullable().optional(),
  attempt: z.string().trim().max(40).nullable().optional(),
  focus: z
    .object({
      papers: z.enum(['prelims', 'mains', 'both']).optional(),
      subjects: z.array(z.string().max(60)).max(30).optional(),
    })
    .optional(),
});

const prefsSchema = z.object({
  dailyGoalMin: z.number().int().min(30).max(960).optional(),
  weeklyGoalMin: z.number().int().min(30).max(6720).optional(),
  windows: z.array(z.enum(['morning', 'afternoon', 'evening', 'night'])).max(4).optional(),
  weekStart: z.enum(['monday', 'sunday']).optional(),
  defaultSessionMin: z
    .number()
    .int()
    .refine((n) => n >= 15 && n <= 180 && n % 5 === 0, 'Must be between 15 and 180 in steps of 5')
    .optional(),
  remindersEnabled: z.boolean().optional(),
});

@Controller('me')
@UseGuards(AuthGuard)
export class MeSettingsController {
  constructor(private readonly prep: PreparationService) {}

  @Get('profile')
  profile(@CurrentUser() user: UserView) {
    return this.prep.getAccountProfile(user.id);
  }

  @Patch()
  async patchMe(@CurrentUser() user: UserView, @Body() body: unknown): Promise<{ user: UserView }> {
    const patch = parse(patchMeSchema, body);
    await this.prep.updateAccountProfile(user.id, patch);
    const p = await this.prep.getAccountProfile(user.id);
    return { user: { ...user, name: p.name, timezone: p.timezone } };
  }

  @Get('preparation-profile')
  getPrep(@CurrentUser() user: UserView) {
    return this.prep.getProfile(user.id);
  }

  @Put('preparation-profile')
  putPrep(@CurrentUser() user: UserView, @Body() body: unknown) {
    return this.prep.upsertProfile(user.id, parse(prepSchema, body));
  }

  @Get('study-preferences')
  getPrefs(@CurrentUser() user: UserView) {
    return this.prep.getPreferences(user.id);
  }

  @Put('study-preferences')
  putPrefs(@CurrentUser() user: UserView, @Body() body: unknown) {
    return this.prep.upsertPreferences(user.id, parse(prefsSchema, body));
  }
}
