/** Pure, DST-safe calendar helpers built on Intl (no date libraries). */

export interface DateRange {
  start: Date;
  end: Date; // exclusive
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

function parts(instant: Date, tz: string) {
  const o: Record<string, number> = {};
  for (const p of formatter(tz).formatToParts(instant)) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return o;
}

/** Offset (ms) of `tz` from UTC at `instant`. */
function offsetMs(instant: Date, tz: string): number {
  const p = parts(instant, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant at which the civil date y-m-d (month 1-based, may overflow) starts in `tz`. */
function startOfCivilDay(y: number, m: number, d: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - offsetMs(new Date(guess), tz);
  const off2 = offsetMs(new Date(t), tz);
  t = guess - off2;
  return new Date(t);
}

function parseISO(dateISO: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) throw new Error(`Invalid date: ${dateISO}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function dayRange(dateISO: string, tz: string): DateRange {
  const [y, m, d] = parseISO(dateISO);
  return { start: startOfCivilDay(y, m, d, tz), end: startOfCivilDay(y, m, d + 1, tz) };
}

export function weekRange(dateISO: string, tz: string, weekStart: 'monday' | 'sunday'): DateRange {
  const [y, m, d] = parseISO(dateISO);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const back = weekStart === 'monday' ? (dow + 6) % 7 : dow;
  return { start: startOfCivilDay(y, m, d - back, tz), end: startOfCivilDay(y, m, d - back + 7, tz) };
}

/** `month` is 1-12. */
export function monthRange(year: number, month: number, tz: string): DateRange {
  return { start: startOfCivilDay(year, month, 1, tz), end: startOfCivilDay(year, month + 1, 1, tz) };
}

export function localDateOf(instant: Date, tz: string): string {
  const p = parts(instant, tz);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** `dateISO` shifted by `n` civil days (calendar arithmetic, zone-independent). */
export function addDaysISO(dateISO: string, n: number): string {
  const [y, m, d] = parseISO(dateISO);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
