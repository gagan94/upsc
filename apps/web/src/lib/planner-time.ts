/** Planner time helpers: all conversions use the USER's IANA zone, never the browser's. */

function parts(date: Date, tz: string): Record<string, number> {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const out: Record<string, number> = {};
  for (const p of f) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out;
}

/** Offset of `tz` from UTC at the given instant, in ms (positive east of UTC). */
function offsetMs(date: Date, tz: string): number {
  const p = parts(date, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
}

/** The instant (ISO string) at which the wall clock in `tz` reads `dateISO` `time` (HH:mm). */
export function zonedInstant(dateISO: string, time: string, tz: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wall - offsetMs(new Date(wall), tz);
  guess = wall - offsetMs(new Date(guess), tz);
  return new Date(guess).toISOString();
}

/** Wall-clock "HH:mm" of an instant in `tz`. */
export function localTime(iso: string, tz: string): string {
  const p = parts(new Date(iso), tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** "9:30 am" style label of an instant in `tz`. */
export function formatTimeLabel(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

/** "Tue, 13 Oct" label of an instant (or YYYY-MM-DD) in `tz`. */
export function formatDayShort(iso: string, tz: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: dateOnly ? "UTC" : tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(dateOnly ? `${iso}T00:00:00Z` : iso));
}
