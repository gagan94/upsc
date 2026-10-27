export type Period = 'day' | 'week' | 'month' | 'lifetime' | 'none';

export interface UsageWindow {
  start: Date;
  /** Next window boundary; null for lifetime/none. */
  resetsAt: Date | null;
}

const EPOCH = new Date(0);

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(tz, f);
  }
  return f;
}

function localParts(at: Date, tz: string) {
  const p: Record<string, number> = {};
  for (const part of formatter(tz).formatToParts(at)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset (ms) of `tz` from UTC at the given instant. */
function offsetMs(at: Date, tz: string): number {
  const p = localParts(at, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** UTC instant of local 00:00 on the given calendar date (month is 0-based; overflow normalises). */
function localMidnight(year: number, month: number, day: number, tz: string): Date {
  const guess = Date.UTC(year, month, day);
  let t = guess - offsetMs(new Date(guess), tz);
  const corrected = guess - offsetMs(new Date(t), tz);
  if (corrected !== t) t = corrected;
  return new Date(t);
}

export function windowFor(period: Period, timezone: string, now: Date = new Date()): UsageWindow {
  if (period === 'lifetime' || period === 'none') return { start: EPOCH, resetsAt: null };
  const { year, month, day } = localParts(now, timezone);
  const m = month - 1;
  if (period === 'day') {
    return {
      start: localMidnight(year, m, day, timezone),
      resetsAt: localMidnight(year, m, day + 1, timezone),
    };
  }
  if (period === 'week') {
    const sinceMonday = (new Date(Date.UTC(year, m, day)).getUTCDay() + 6) % 7;
    return {
      start: localMidnight(year, m, day - sinceMonday, timezone),
      resetsAt: localMidnight(year, m, day - sinceMonday + 7, timezone),
    };
  }
  return {
    start: localMidnight(year, m, 1, timezone),
    resetsAt: localMidnight(year, m + 1, 1, timezone),
  };
}
