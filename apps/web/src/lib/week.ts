import { addDays } from "./time";

/** Seven consecutive dates starting at startISO. */
export function weekDays(startISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startISO, i));
}

/**
 * Calendar grid for a month: rows of 7 cells, `null` for padding outside the month.
 * `month` is 1-based (October = 10).
 */
export function monthGrid(year: number, month: number, weekStart: "monday" | "sunday"): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dow = first.getUTCDay();
  const lead = weekStart === "monday" ? (dow + 6) % 7 : dow;
  const cells: (string | null)[] = Array(lead).fill(null);
  const mm = String(month).padStart(2, "0");
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${mm}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
