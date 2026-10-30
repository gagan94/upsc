import { dayRange, localDateOf } from '../common/dates';
import { buildStarterPlan, StarterAnswers } from './starter-plan';

const TZ = 'Asia/Kolkata';
const NOW = new Date('2026-10-14T14:30:00Z'); // 20:00 IST on 2026-10-14
const subjects = [
  { slug: 'polity', title: 'Polity', syllabusNodeId: 'n-polity' },
  { slug: 'history', title: 'History', syllabusNodeId: 'n-history' },
  { slug: 'geography', title: 'Geography', syllabusNodeId: 'n-geo' },
  { slug: 'economy', title: 'Economy', syllabusNodeId: 'n-eco' },
];
const answers = (over: Partial<StarterAnswers> = {}, weeklyMin = 1680): StarterAnswers => ({
  targetYear: 2027,
  focus: { subjects: ['polity', 'history'] },
  routine: { dailyMin: 240, weeklyMin, windows: ['evening'] },
  ...over,
});
const plan = (a: StarterAnswers, now = NOW) => buildStarterPlan({ answers: a, subjects, now, tz: TZ });
const total = (tasks: { durationMin?: number | null }[]) => tasks.reduce((s, t) => s + (t.durationMin ?? 0), 0);

describe('buildStarterPlan', () => {
  it.each([300, 1680])('keeps total minutes within the weekly cap of %i', (cap) => {
    const tasks = plan(answers({}, cap));
    expect(tasks.length).toBeGreaterThan(0);
    expect(total(tasks)).toBeLessThanOrEqual(cap);
  });

  it('creates at most 15 tasks, each 30-60 minutes (the revision task 30)', () => {
    const tasks = plan(answers());
    expect(tasks.length).toBeLessThanOrEqual(15);
    for (const t of tasks) {
      expect(t.durationMin).toBeGreaterThanOrEqual(30);
      expect(t.durationMin).toBeLessThanOrEqual(60);
    }
  });

  it('contains exactly one starter revision task, on day 2', () => {
    const tasks = plan(answers());
    const rev = tasks.filter((t) => t.activityType === 'revision');
    expect(rev).toHaveLength(1);
    expect(rev[0].title).toBe('Starter revision: review your notes');
    expect(localDateOf(rev[0].scheduledStart!, TZ)).toBe('2026-10-16');
  });

  it('never schedules 4 consecutive blocks of the same subject (and 1 subject cannot exceed 3 in a row)', () => {
    for (const subs of [['polity', 'history'], ['polity', 'history', 'geography'], ['polity']]) {
      const tasks = plan(answers({ focus: { subjects: subs } }));
      const order = [...tasks].sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime());
      let run = 0;
      let prev: string | null | undefined;
      for (const t of order) {
        run = t.subjectNodeId && t.subjectNodeId === prev ? run + 1 : 1;
        prev = t.subjectNodeId;
        expect(run).toBeLessThanOrEqual(3);
      }
    }
  });

  it('alternates reading and practice_mcq for subject blocks', () => {
    const blocks = plan(answers()).filter((t) => t.activityType !== 'revision');
    const order = [...blocks].sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime());
    order.forEach((t, i) => expect(t.activityType).toBe(i % 2 === 0 ? 'reading' : 'practice_mcq'));
  });

  it('is deterministic', () => {
    expect(plan(answers())).toEqual(plan(answers()));
  });

  it('falls back to the first three subjects when none are chosen', () => {
    for (const a of [answers({ focus: {} }), answers({ focus: { subjects: [] } }), answers({ focus: undefined })]) {
      const ids = new Set(plan(a).map((t) => t.subjectNodeId).filter(Boolean));
      expect(ids).toEqual(new Set(['n-polity', 'n-history', 'n-geo']));
    }
  });

  it('schedules on days 1-7 after now in the user tz, within the daily cap', () => {
    const tasks = plan(answers({ routine: { dailyMin: 90, weeklyMin: 1680, windows: ['evening'] } }));
    const days = new Map<string, number>();
    for (const t of tasks) {
      const d = localDateOf(t.scheduledStart!, TZ);
      days.set(d, (days.get(d) ?? 0) + (t.durationMin ?? 0));
      expect(t.scheduledStart!.getTime()).toBeGreaterThanOrEqual(dayRange('2026-10-15', TZ).start.getTime());
      expect(t.scheduledStart!.getTime()).toBeLessThan(dayRange('2026-10-22', TZ).start.getTime());
    }
    for (const m of days.values()) expect(m).toBeLessThanOrEqual(90);
  });

  it('starts today when it is before 18:00 local and a window is still ahead', () => {
    const morningNow = new Date('2026-10-14T04:30:00Z'); // 10:00 IST
    const tasks = plan(answers(), morningNow);
    expect(tasks.some((t) => localDateOf(t.scheduledStart!, TZ) === '2026-10-14')).toBe(true);
    for (const t of tasks) expect(t.scheduledStart!.getTime()).toBeGreaterThan(morningNow.getTime());
  });

  it('puts start times inside the chosen windows (default evening)', () => {
    const hhmm = (d: Date) =>
      new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
    const starts = (windows: string[]) =>
      plan(answers({ routine: { dailyMin: 240, weeklyMin: 1680, windows } })).map((t) => hhmm(t.scheduledStart!));
    expect(starts(['morning'])[0]).toBe('07:00');
    expect(starts(['afternoon'])[0]).toBe('14:00');
    expect(starts(['night'])[0]).toBe('21:00');
    expect(starts([])[0]).toBe('18:30');
    expect(starts(['evening'])[0]).toBe('18:30');
  });

  it('subject tasks carry the subject node id', () => {
    const t = plan(answers()).find((x) => x.activityType === 'reading')!;
    expect(t.subjectNodeId).toBe('n-polity');
    expect(t.title).toContain('Polity');
  });
});

describe('buildStarterPlan with no subjects', () => {
  it('returns an empty plan for an empty catalog', () => {
    expect(buildStarterPlan({ answers: answers(), subjects: [], now: NOW, tz: TZ })).toEqual([]);
  });
});
