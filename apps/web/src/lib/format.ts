/** "1h 20m", "2h", "45m", "0m". */
export function formatMinutes(min: number): string {
  const total = Number.isFinite(min) ? Math.max(0, Math.round(min)) : 0;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "22:14", or "1:02:05" past an hour. */
export function formatDuration(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

/** "Wednesday, 14 October 2026". A plain YYYY-MM-DD is treated as that calendar day; an instant is read in `tz`. */
export function formatDateLong(iso: string, tz: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: dateOnly ? "UTC" : tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(new Date(dateOnly ? `${iso}T00:00:00Z` : iso));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")}`;
}
