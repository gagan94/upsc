import Link from "next/link";
import type { AdminQuestionReport } from "@/lib/types";

const TYPE_LABEL: Record<AdminQuestionReport["type"], string> = {
  wrong_key: "Wrong key",
  typo: "Typo",
  ambiguous: "Ambiguous",
  other: "Other",
};

const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export function ReportsPanel({ reports }: { reports: AdminQuestionReport[] }) {
  if (reports.length === 0) return <p className="mt-4 text-sm text-muted">No open reports</p>;
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {reports.map((r) => (
        <li key={r.id} className="rounded-card border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-control border border-border bg-bg px-2 py-0.5 text-xs font-semibold">{TYPE_LABEL[r.type]}</span>
            <span className="text-xs text-muted">{fmt.format(new Date(r.createdAt))}</span>
          </div>
          <Link href={`/admin/questions/${r.questionId}`} className="mt-2 block font-medium text-primary underline">
            {r.stem}
          </Link>
          {r.text ? <p className="mt-1 text-sm">{r.text}</p> : null}
        </li>
      ))}
    </ul>
  );
}
