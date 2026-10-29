import { addDaysISO, dayRange, localDateOf } from '../common/dates';
import type { NewTask } from '../planner/tasks.service';

export interface StarterAnswers {
  targetYear?: 2027 | 2028 | null;
  stage?: 'beginner' | 'preparing' | 'revision';
  attempt?: string | null;
  focus?: { papers?: 'prelims' | 'mains' | 'both'; subjects?: string[] };
  routine?: { dailyMin: number; weeklyMin: number; windows: string[] };
  support?: string[];
}

export interface PlanSubject {
  slug: string;
  title: string;
  syllabusNodeId: string;
}

export const DEFAULT_WEEKLY_MIN = 1680;
const DEFAULT_DAILY_MIN = 240;
const MAX_TASKS = 15;
const DAYS = 7;
const MAX_RUN = 3;
const REVISION_MIN = 30;
const READING_MIN = 60;
const PRACTICE_MIN = 30;
const MIN_BLOCK = 30;
const REVISION_DAY_INDEX = 1; // "day 2"
export const STARTER_REVISION_TITLE = 'Starter revision: review your notes';

/** Window start and end (exclusive), minutes after local midnight. */
const WINDOWS: Record<string, { start: number; end: number }> = {
  morning: { start: 7 * 60, end: 12 * 60 },
  afternoon: { start: 14 * 60, end: 18 * 60 },
  evening: { start: 18 * 60 + 30, end: 22 * 60 + 30 },
  night: { start: 21 * 60, end: 24 * 60 },
};
const WINDOW_ORDER = ['morning', 'afternoon', 'evening', 'night'];

export interface StarterPlanInput {
  answers: StarterAnswers;
  subjects: PlanSubject[];
  now: Date;
  tz: string;
}

function pickSubjects(answers: StarterAnswers, all: PlanSubject[]): PlanSubject[] {
  const wanted = answers.focus?.subjects ?? [];
  const chosen: PlanSubject[] = [];
  for (const slug of wanted) {
    const s = all.find((x) => x.slug === slug);
    if (s && !chosen.includes(s)) chosen.push(s);
  }
  return chosen.length ? chosen : all.slice(0, 3);
}

/** Deterministic, rule-based 7-day starter plan. Pure: no I/O, no clock reads. */
export function buildStarterPlan({ answers, subjects, now, tz }: StarterPlanInput): NewTask[] {
  const dailyCap = answers.routine?.dailyMin ?? DEFAULT_DAILY_MIN;
  let weeklyLeft = answers.routine?.weeklyMin ?? DEFAULT_WEEKLY_MIN;
  // Hold back the revision task's minutes so earlier days cannot starve it.
  let reserve = weeklyLeft >= REVISION_MIN ? REVISION_MIN : 0;
  weeklyLeft -= reserve;
  const chosenWindows = WINDOW_ORDER.filter((w) => answers.routine?.windows?.includes(w));
  const windows = (chosenWindows.length ? chosenWindows : ['evening']).map((w) => WINDOWS[w]);
  const pool = pickSubjects(answers, subjects);
  if (!pool.length) return [];

  const today = localDateOf(now, tz);
  const localHour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(now),
  );
  // Today only counts when it is before 18:00 and a chosen window start is still ahead.
  const todayStart = dayRange(today, tz).start.getTime();
  const todayUsable = localHour < 18 && windows.some((w) => todayStart + w.start * 60_000 > now.getTime());
  const firstDay = todayUsable ? today : addDaysISO(today, 1);

  const out: NewTask[] = [];
  let blockN = 0; // subject blocks emitted (drives subject rotation + reading/practice alternation)
  let run = 0;
  let lastSubject: string | null = null;
  const perDayBase = Math.floor(MAX_TASKS / DAYS);
  const extraDays = MAX_TASKS % DAYS;

  for (let d = 0; d < DAYS && out.length < MAX_TASKS && weeklyLeft + reserve >= MIN_BLOCK; d++) {
    const date = addDaysISO(firstDay, d);
    const dayStart = dayRange(date, tz).start.getTime();
    const dayTasksCap = perDayBase + (d < extraDays ? 1 : 0);
    if (d === REVISION_DAY_INDEX) {
      weeklyLeft += reserve;
      reserve = 0;
    }
    let dayLeft = Math.min(dailyCap, weeklyLeft);
    let dayCount = 0;
    // Cursor per window so blocks stack inside a window.
    const cursors = windows.map((w) => w.start);
    const slot = (duration: number): Date | null => {
      for (let i = 0; i < windows.length; i++) {
        const at = dayStart + cursors[i] * 60_000;
        if (cursors[i] >= windows[i].end) continue;
        if (at <= now.getTime()) continue;
        cursors[i] += duration;
        return new Date(at);
      }
      return null;
    };
    const place = (task: Omit<NewTask, 'scheduledStart'>, duration: number): boolean => {
      const at = slot(duration);
      if (!at) return false;
      out.push({ ...task, durationMin: duration, scheduledStart: at });
      dayLeft -= duration;
      weeklyLeft -= duration;
      dayCount++;
      return true;
    };

    if (d === REVISION_DAY_INDEX && dayLeft >= REVISION_MIN) {
      if (place({ title: STARTER_REVISION_TITLE, activityType: 'revision', priority: 'normal' }, REVISION_MIN)) {
        run = 0;
        lastSubject = null;
      }
    }

    while (dayCount < dayTasksCap && out.length < MAX_TASKS) {
      const subject = pool[blockN % pool.length];
      if (subject.syllabusNodeId === lastSubject && run >= MAX_RUN) break;
      const reading = blockN % 2 === 0;
      const want = reading ? READING_MIN : PRACTICE_MIN;
      const duration = Math.min(want, dayLeft);
      if (duration < MIN_BLOCK) break;
      const ok = place(
        {
          title: `${reading ? 'Read' : 'Practice MCQs'}: ${subject.title}`,
          subjectNodeId: subject.syllabusNodeId,
          activityType: reading ? 'reading' : 'practice_mcq',
          priority: 'normal',
        },
        duration,
      );
      if (!ok) break;
      run = subject.syllabusNodeId === lastSubject ? run + 1 : 1;
      lastSubject = subject.syllabusNodeId;
      blockN++;
    }
  }
  return out;
}
