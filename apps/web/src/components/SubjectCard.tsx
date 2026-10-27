import type { SubjectSummary } from "@/lib/types";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function SubjectCard({ subject }: { subject: SubjectSummary }) {
  return (
    <article className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <span className="w-fit rounded-control bg-bg px-2 py-0.5 text-[11px] font-semibold text-primary">
        {subject.gsPaper}
      </span>
      <h2 className="text-lg font-bold text-text">{subject.title}</h2>
      <p className="text-sm text-muted">
        {plural(subject.moduleCount, "module")} · {plural(subject.lessonCount, "lesson")}
      </p>
    </article>
  );
}
