import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { Db } from '../db/db.module';
import { bookmarks, mistakeEntries, sessions } from '../db/schema';
import { sessionTitle } from '../practice/session-title';

export interface HomePracticeSummary {
  recentSessions: { id: string; title: string; accuracy: number | null; submittedAt: string }[];
  mistakesCount: number;
  bookmarksCount: number;
}

/** The `practice` block of GET /home. Every query is filtered by `userId`. */
export async function homePracticeSummary(db: Db, userId: string): Promise<HomePracticeSummary> {
  const [recent, [mistakes], [marks]] = await Promise.all([
    db
      .select({ id: sessions.id, summary: sessions.summary, accuracy: sessions.accuracy, submittedAt: sessions.submittedAt })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), inArray(sessions.status, ['submitted', 'expired'])))
      .orderBy(desc(sessions.submittedAt), desc(sessions.id))
      .limit(3),
    db.select({ n: count() }).from(mistakeEntries).where(and(eq(mistakeEntries.userId, userId), isNull(mistakeEntries.resolvedAt))),
    db.select({ n: count() }).from(bookmarks).where(eq(bookmarks.userId, userId)),
  ]);
  return {
    recentSessions: recent.map((r) => ({
      id: r.id,
      title: sessionTitle(r.summary),
      accuracy: r.accuracy === null ? null : Number(r.accuracy),
      submittedAt: (r.submittedAt as Date).toISOString(),
    })),
    mistakesCount: Number(mistakes.n),
    bookmarksCount: Number(marks.n),
  };
}
