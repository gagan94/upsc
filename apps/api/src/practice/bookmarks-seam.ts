import { and, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/db.module';
import { bookmarks } from '../db/schema';

/** Which of `questionIds` the user has bookmarked (filtered by `userId`). */
export async function bookmarkedQuestionIds(db: Db, userId: string, questionIds: string[]): Promise<Set<string>> {
  if (!questionIds.length) return new Set();
  const rows = await db
    .select({ id: bookmarks.questionId })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), inArray(bookmarks.questionId, questionIds)));
  return new Set(rows.map((r) => r.id));
}
