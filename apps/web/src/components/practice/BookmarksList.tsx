import type { BookmarkItem } from "@/lib/types";

export function BookmarksList({ items }: { items: BookmarkItem[] }) {
  if (items.length === 0) return <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted">No bookmarks yet. Bookmark a question while reviewing a set and it will show up here.</p>;
  return (
    <ul className="divide-y divide-border rounded-card border border-border bg-surface">
      {items.map((b) => (
        <li key={b.questionId} className="flex flex-col gap-1 px-4 py-3">
          <p className="text-sm text-text">{b.stem}</p>
          <p className="text-xs text-muted">{b.subjectTitle}</p>
        </li>
      ))}
    </ul>
  );
}
