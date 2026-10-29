import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, Db } from '../db/db.module';
import { preparationProfiles, profiles, studyPreferences, users } from '../db/schema';

export interface PrepFocus {
  papers?: 'prelims' | 'mains' | 'both';
  subjects?: string[];
}

export interface PrepProfileView {
  targetYear: number | null;
  stage: 'beginner' | 'preparing' | 'revision' | null;
  attempt: string | null;
  focus: PrepFocus;
  medium: string;
  onboardingStatus: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  onboardingStep: number;
  onboardingAnswers: Record<string, unknown>;
}

export interface PrefsView {
  dailyGoalMin: number;
  weeklyGoalMin: number;
  windows: string[];
  weekStart: 'monday' | 'sunday';
  defaultSessionMin: number;
  remindersEnabled: boolean;
}

export interface ProfileView {
  name: string;
  email: string;
  bio: string | null;
  location: string | null;
  timezone: string;
}

export type PrepProfilePatch = Partial<Pick<PrepProfileView, 'targetYear' | 'stage' | 'attempt' | 'focus'>>;
export type PrefsPatch = Partial<PrefsView>;
export type ProfilePatch = { name?: string; bio?: string | null; location?: string | null; timezone?: string };

export const PREP_DEFAULTS: PrepProfileView = {
  targetYear: null,
  stage: null,
  attempt: null,
  focus: {},
  medium: 'en',
  onboardingStatus: 'not_started',
  onboardingStep: 0,
  onboardingAnswers: {},
};

export const PREFS_DEFAULTS: PrefsView = {
  dailyGoalMin: 240,
  weeklyGoalMin: 1680,
  windows: [],
  weekStart: 'monday',
  defaultSessionMin: 25,
  remindersEnabled: false,
};

@Injectable()
export class PreparationService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async getProfile(userId: string): Promise<PrepProfileView> {
    const [r] = await this.db.select().from(preparationProfiles).where(eq(preparationProfiles.userId, userId)).limit(1);
    if (!r) return { ...PREP_DEFAULTS, focus: {}, onboardingAnswers: {} };
    return {
      targetYear: r.targetYear,
      stage: r.stage as PrepProfileView['stage'],
      attempt: r.attempt,
      focus: (r.focus ?? {}) as PrepFocus,
      medium: r.medium ?? PREP_DEFAULTS.medium,
      onboardingStatus: (r.onboardingStatus ?? PREP_DEFAULTS.onboardingStatus) as PrepProfileView['onboardingStatus'],
      onboardingStep: r.onboardingStep ?? 0,
      onboardingAnswers: (r.onboardingAnswers ?? {}) as Record<string, unknown>,
    };
  }

  async upsertProfile(userId: string, patch: PrepProfilePatch): Promise<PrepProfileView> {
    const values = { ...patch, updatedAt: new Date() };
    await this.db
      .insert(preparationProfiles)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: preparationProfiles.userId, set: values });
    return this.getProfile(userId);
  }

  async getPreferences(userId: string): Promise<PrefsView> {
    const [r] = await this.db.select().from(studyPreferences).where(eq(studyPreferences.userId, userId)).limit(1);
    if (!r) return { ...PREFS_DEFAULTS, windows: [] };
    return {
      dailyGoalMin: r.dailyGoalMin ?? PREFS_DEFAULTS.dailyGoalMin,
      weeklyGoalMin: r.weeklyGoalMin ?? PREFS_DEFAULTS.weeklyGoalMin,
      windows: (r.windows ?? []) as string[],
      weekStart: (r.weekStart ?? 'monday') as PrefsView['weekStart'],
      defaultSessionMin: r.defaultSessionMin ?? PREFS_DEFAULTS.defaultSessionMin,
      remindersEnabled: r.remindersEnabled ?? false,
    };
  }

  async upsertPreferences(userId: string, patch: PrefsPatch): Promise<PrefsView> {
    const values = { ...patch, updatedAt: new Date() };
    await this.db
      .insert(studyPreferences)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: studyPreferences.userId, set: values });
    return this.getPreferences(userId);
  }

  async getAccountProfile(userId: string): Promise<ProfileView> {
    const [r] = await this.db
      .select({ name: users.name, email: users.email, timezone: users.timezone, bio: profiles.bio, location: profiles.location })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    return { name: r.name, email: r.email, bio: r.bio ?? null, location: r.location ?? null, timezone: r.timezone };
  }

  async updateAccountProfile(userId: string, patch: ProfilePatch): Promise<void> {
    await this.db.transaction(async (tx) => {
      const userSet: Partial<typeof users.$inferInsert> = {};
      if (patch.name !== undefined) userSet.name = patch.name;
      if (patch.timezone !== undefined) userSet.timezone = patch.timezone;
      if (Object.keys(userSet).length) await tx.update(users).set(userSet).where(eq(users.id, userId));
      const profSet: Partial<typeof profiles.$inferInsert> = {};
      if (patch.name !== undefined) profSet.displayName = patch.name;
      if (patch.bio !== undefined) profSet.bio = patch.bio;
      if (patch.location !== undefined) profSet.location = patch.location;
      if (Object.keys(profSet).length) await tx.update(profiles).set(profSet).where(eq(profiles.userId, userId));
    });
  }
}
