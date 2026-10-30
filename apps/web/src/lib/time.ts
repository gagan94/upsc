/** Calendar date (YYYY-MM-DD) of an instant in an IANA time zone. */
export function localDate(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Add whole days to a YYYY-MM-DD date (pure calendar arithmetic, no zone involved). */
export function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** First day of the week containing dateISO. */
export function startOfWeek(dateISO: string, weekStart: "monday" | "sunday"): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const back = weekStart === "monday" ? (dow + 6) % 7 : dow;
  return addDays(dateISO, -back);
}
