import Link from "next/link";
import type { AttemptSummary } from "@/lib/types";
import { AttemptRow } from "./AttemptsList";

export function RecentSets({ attempts, tz }: { attempts: AttemptSummary[]; tz: string }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-4">
        <h2 className="text-base font-bold text-text">Start a practice set</h2>
        <p className="text-sm text-muted">Pick subjects, a question count and a mode. The questions are sample data while the question bank is being built.</p>
        <Link href="/prelims/new" className="rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-text">Start a practice set</Link>
      </section>
      <section aria-labelledby="recent-heading" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="text-base font-bold text-text">Recent sets</h2>
          <Link href="/prelims?tab=attempts" className="text-sm font-semibold text-primary hover:underline">All attempts</Link>
        </div>
        {attempts.length === 0 ? (
          <p className="rounded-card border border-border bg-surface p-4 text-sm text-muted">No sets yet. Your finished sets will appear here.</p>
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {attempts.map((a) => <AttemptRow key={a.id} a={a} tz={tz} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
