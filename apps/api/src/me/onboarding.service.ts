import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { CatalogService } from '../catalog/catalog.service';
import { AppError } from '../common/errors';
import { DB, Db } from '../db/db.module';
import { preparationProfiles } from '../db/schema';
import type { NewTask } from '../planner/tasks.service';
import { TasksService } from '../planner/tasks.service';
import { PreparationService } from './preparation.service';
import { buildStarterPlan, StarterAnswers } from './starter-plan';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingView {
  status: OnboardingStatus;
  step: number;
  answers: StarterAnswers;
}

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly prep: PreparationService,
    private readonly tasks: TasksService,
    private readonly catalog: CatalogService,
  ) {}

  async get(userId: string): Promise<OnboardingView> {
    const p = await this.prep.getProfile(userId);
    return { status: p.onboardingStatus, step: p.onboardingStep, answers: p.onboardingAnswers as StarterAnswers };
  }

  async save(
    userId: string,
    input: { step: number; answers: StarterAnswers; status?: 'in_progress' | 'skipped' },
  ): Promise<OnboardingView> {
    const current = await this.get(userId);
    if (current.status === 'completed') throw new AppError(409, 'already_completed', 'Onboarding is already completed');
    const answers = { ...current.answers, ...input.answers };
    const values = {
      onboardingStatus: input.status ?? 'in_progress',
      onboardingStep: input.step,
      onboardingAnswers: answers,
      updatedAt: new Date(),
    };
    // Never regress a completed row, even if a concurrent complete() won the race.
    await this.db
      .insert(preparationProfiles)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: preparationProfiles.userId,
        set: values,
        setWhere: sql`${preparationProfiles.onboardingStatus} is distinct from 'completed'`,
      });
    return this.get(userId);
  }

  async preview(userId: string, tz: string, now = new Date()): Promise<{ tasks: NewTask[] }> {
    const { answers } = await this.get(userId);
    if (!answers.routine) {
      throw new AppError(400, 'onboarding_incomplete', 'Tell us about your study routine before previewing a plan');
    }
    return { tasks: await this.build(answers, tz, now) };
  }

  async complete(userId: string, tz: string, acceptPlan: boolean, now = new Date()): Promise<{ createdTasks: number }> {
    const { answers, status: before } = await this.get(userId);
    if (before === 'completed') throw new AppError(409, 'already_completed', 'Onboarding is already completed');
    if (acceptPlan && !answers.routine) {
      throw new AppError(400, 'onboarding_incomplete', 'Tell us about your study routine before accepting a plan');
    }
    const plan = acceptPlan ? await this.build(answers, tz, now) : [];

    // The conditional upsert is the single gate: only the request that flips the
    // status away from 'completed' proceeds, so a concurrent double submit creates tasks once.
    const profile = {
      ...(answers.targetYear !== undefined ? { targetYear: answers.targetYear } : {}),
      ...(answers.stage !== undefined ? { stage: answers.stage } : {}),
      ...(answers.attempt !== undefined ? { attempt: answers.attempt } : {}),
      ...(answers.focus !== undefined ? { focus: answers.focus } : {}),
    };
    const values = { ...profile, onboardingStatus: 'completed', updatedAt: new Date() };
    const won = await this.db
      .insert(preparationProfiles)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: preparationProfiles.userId,
        set: values,
        setWhere: sql`${preparationProfiles.onboardingStatus} is distinct from 'completed'`,
      })
      .returning({ userId: preparationProfiles.userId });
    if (!won.length) throw new AppError(409, 'already_completed', 'Onboarding is already completed');

    try {
      if (answers.routine) {
        await this.prep.upsertPreferences(userId, {
          dailyGoalMin: answers.routine.dailyMin,
          weeklyGoalMin: answers.routine.weeklyMin,
          windows: answers.routine.windows,
        });
      }
      const created = await this.tasks.createMany(userId, plan, 'starter_plan');
      return { createdTasks: created.length };
    } catch (e) {
      // TasksService has no transaction handle: undo the gate so the user can retry.
      await this.db
        .update(preparationProfiles)
        .set({ onboardingStatus: before, updatedAt: new Date() })
        .where(and(eq(preparationProfiles.userId, userId), eq(preparationProfiles.onboardingStatus, 'completed')));
      throw e;
    }
  }

  private async build(answers: StarterAnswers, tz: string, now: Date): Promise<NewTask[]> {
    const subjects = await this.catalog.findBySlugs();
    return buildStarterPlan({ answers, subjects, now, tz });
  }
}
