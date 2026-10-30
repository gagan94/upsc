"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import type { MistakeItem, PracticeSubject } from "@/lib/types";

const REASONS = { incorrect: "Incorrect", guessed: "Guessed" } as const;

/**
 * The API item exposes only the subject title (not its node id), so there is no
 * "Practise this topic" link here; the subject filter below is the way to narrow down.
 */
export function MistakesList({
  items,
  subjects,
  subject,
  includeResolved,
}: {
  items: MistakeItem[];
  subjects: PracticeSubject[];
  subject: string;
  includeResolved: boolean;
}) {
  const router = useRouter();
  const go = (s: string, r: boolean) => {
    const q = [s ? `subject=${s}` : "", r ? "resolved=1" : ""].filter(Boolean).join("&");
    router.push(`/prelims?tab=mistakes${q ? `&${q}` : ""}`);
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="Subject"
          value={subject}
          onChange={(e) => go(e.target.value, includeResolved)}
          options={[{ value: "", label: "All subjects" }, ...subjects.map((s) => ({ value: s.id, label: s.title }))]}
        />
        <label className="flex items-center gap-2 pb-2 text-sm text-text">
          <input type="checkbox" className="h-4 w-4" checked={includeResolved} onChange={(e) => go(subject, e.target.checked)} />
          Include resolved
        </label>
      </div>
      {items.length === 0 ? (
        <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted">No mistakes to review. Questions you get wrong or guess will collect here.</p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {items.map((m) => (
            <li key={m.questionId} className="flex flex-col gap-1 px-4 py-3">
              <p className="text-sm text-text">{m.stem}</p>
              <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                <span>{m.subjectTitle}</span>
                <span>{REASONS[m.reason]}</span>
                <span>Wrong {m.timesWrong} {m.timesWrong === 1 ? "time" : "times"}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
