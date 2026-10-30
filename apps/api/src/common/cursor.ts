import { SQL, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { AppError } from './errors';

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Microsecond-precision UTC timestamp, as produced by `cursorTs`.
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

export function parseLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(Math.max(n, 1), MAX_LIMIT);
}

export interface Cursor {
  ts: string;
  id: string;
}

export function decodeCursor(raw: string): Cursor {
  const bad = () => new AppError(400, 'invalid_cursor', 'Invalid cursor');
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) throw bad();
  const [ts, id, ...rest] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
  if (rest.length || !ts || !id || !TS_RE.test(ts) || !UUID_RE.test(id)) throw bad();
  return { ts, id };
}

export function encodeCursor(cursorTs: string, id: string): string {
  return Buffer.from(`${cursorTs}|${id}`).toString('base64url');
}

/** Select this next to the row so the cursor carries created_at at full microsecond precision. */
export function cursorTs(createdAt: PgColumn): SQL<string> {
  return sql<string>`to_char(${createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
}

/** WHERE fragment for ascending keyset pagination on (created_at, id). */
export function afterCursor(createdAt: PgColumn, id: PgColumn, cursor: Cursor | null): SQL | undefined {
  return cursor ? sql`(${createdAt}, ${id}) > (${cursor.ts}::timestamptz, ${cursor.id}::uuid)` : undefined;
}
