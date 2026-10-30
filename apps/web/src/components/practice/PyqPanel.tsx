import Link from "next/link";
import type { PracticeSubject } from "@/lib/types";

export function PyqPanel({ subjects }: { subjects: PracticeSubject[] }) {
  const total = subjects.reduce((n, s) => n + s.pyqVerifiedCount, 0);
  return (
    <section className="flex flex-col gap-4" aria-label="Previous-year questions">
      <p className="text-sm text-muted">
        Verified previous-year questions will appear here once they have been checked against the official papers. Sample questions are never labelled as previous-year questions.
      </p>
      {total === 0 ? (
        <p className="rounded-card border border-border bg-surface p-4 text-sm text-text">No verified previous-year questions yet</p>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {subjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-text">{s.title} <span className="text-muted">· {s.gsPaper}</span></span>
                <span className="font-semibold text-text">{s.pyqVerifiedCount} verified</span>
              </li>
            ))}
          </ul>
          <Link href="/prelims/new?source=pyq" className="inline-flex w-fit rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-text">
            Start a PYQ-only set
          </Link>
        </>
      )}
    </section>
  );
}
