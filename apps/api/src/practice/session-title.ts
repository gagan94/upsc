import type { SessionSummary } from '../db/schema/practice';

/** Human label for a closed session, derived from its stored per-subject summary. */
export function sessionTitle(summary: SessionSummary | null): string {
  const topics = summary?.byTopic ?? [];
  return topics.length === 1 ? `${topics[0].title} practice` : 'Practice set';
}
