import Link from "next/link";
import type { HomeView } from "@/lib/types";
import { HomeCard } from "./HomeCard";

function shortDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short" }).format(new Date(iso));
}

export function PracticeCard({ practice, tz }: { practice: HomeView["practice"]; tz: string }) {
  return (
    <HomeCard id="practice-heading" title="Practice">
      {practice.recentSessions.length === 0 ? (
        <p className="text-sm text-muted">No practice sets yet</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {practice.recentSessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="block">{s.title}</span>
                <span className="text-[11px] text-muted">{shortDate(s.submittedAt, tz)}</span>
              </span>
              <span className="font-semibold">{s.accuracy === null ? (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">No accuracy yet</span>
                  </>
                ) : (
                  `${Math.round(s.accuracy * 100)}%`
                )}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-3 flex gap-6 text-sm">
        <div>
          <dt className="text-[11px] text-muted">Mistakes</dt>
          <dd className="font-semibold">{practice.mistakesCount}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-muted">Bookmarks</dt>
          <dd className="font-semibold">{practice.bookmarksCount}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/prelims/new" className="rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-text">
          Start practice
        </Link>
        <Link href="/prelims?tab=mistakes" className="rounded-control border border-border px-4 py-2 text-sm font-semibold text-text">
          Review mistakes
        </Link>
      </div>
    </HomeCard>
  );
}
