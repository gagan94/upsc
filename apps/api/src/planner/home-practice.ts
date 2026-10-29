export interface HomePracticeSummary {
  recentSessions: { id: string; title: string; accuracy: number | null; submittedAt: string }[];
  mistakesCount: number;
  bookmarksCount: number;
}

/**
 * The `practice` block of GET /home. The practice tables do not exist yet; Task 9 replaces
 * the body of this function (and nothing else) with real queries filtered by `userId`.
 */
export async function homePracticeSummary(_userId: string): Promise<HomePracticeSummary> {
  return { recentSessions: [], mistakesCount: 0, bookmarksCount: 0 };
}
