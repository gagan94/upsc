import { Injectable } from '@nestjs/common';
import { dayRange, localDateOf } from '../common/dates';
import type { UserView } from '../identity/users.service';
import { PreparationService } from '../me/preparation.service';
import { GoalsService } from './goals.service';
import { homePracticeSummary } from './home-practice';
import { TasksService } from './tasks.service';

const PLAN_TASKS = 3;
const MS_PER_DAY = 86400000;

@Injectable()
export class HomeService {
  constructor(
    private readonly prep: PreparationService,
    private readonly goals: GoalsService,
    private readonly tasks: TasksService,
  ) {}

  async home(user: UserView) {
    const tz = user.timezone;
    const today = localDateOf(new Date(), tz);
    const { start, end } = dayRange(today, tz);
    const [profile, examDates, todayTasks, progress, streakDays, practice] = await Promise.all([
      this.prep.getProfile(user.id),
      this.goals.listExamDates(),
      this.tasks.list(user.id, { from: start, to: end }),
      this.goals.progress(user.id, tz),
      this.goals.streakDays(user.id, tz),
      homePracticeSummary(user.id),
    ]);
    const todayMs = Date.parse(`${today}T00:00:00Z`);
    return {
      onboarding: { status: profile.onboardingStatus, step: profile.onboardingStep },
      countdown: examDates
        .map((e) => ({
          exam: e.exam,
          year: e.year,
          date: e.date,
          daysLeft: Math.round((Date.parse(`${e.date}T00:00:00Z`) - todayMs) / MS_PER_DAY),
          illustrative: e.status === 'illustrative',
        }))
        .filter((e) => e.daysLeft >= 0),
      plan: {
        done: todayTasks.filter((t) => t.status === 'completed').length,
        total: todayTasks.length,
        tasks: todayTasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').slice(0, PLAN_TASKS),
      },
      week: {
        recordedMin: progress.totals.recordedMin,
        goalMin: progress.totals.goalMin,
        tasksDone: progress.totals.tasksDone,
        tasksTotal: progress.totals.tasksTotal,
        streakDays,
      },
      practice,
    };
  }
}
