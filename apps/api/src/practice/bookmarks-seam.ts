/**
 * Which of `questionIds` the user has bookmarked. The bookmarks table does not exist yet:
 * Task 9 replaces the body of this function (and nothing else) with a query filtered by `userId`.
 */
export async function bookmarkedQuestionIds(_userId: string, _questionIds: string[]): Promise<Set<string>> {
  return new Set();
}
