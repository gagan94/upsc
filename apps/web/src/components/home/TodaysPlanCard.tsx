import Link from "next/link";
import { formatMinutes } from "@/lib/format";
import type { HomeView } from "@/lib/types";
import { HomeCard } from "./HomeCard";

export function TodaysPlanCard({ plan }: { plan: HomeView["plan"] }) {
  return (
    <HomeCard id="plan-heading" title="Today's plan">
      {plan.total === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted">Nothing planned for today yet.</p>
          <Link href="/planner" className="rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-text">
            Add your first task
          </Link>
        </div>
      ) : (
        <>
          {plan.tasks.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {plan.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {t.subjectTitle ? <span className="block text-[11px] font-semibold text-muted">{t.subjectTitle}</span> : null}
                    <span>{t.title}</span>
                  </span>
                  {t.durationMin ? <span className="text-[11px] text-muted">{formatMinutes(t.durationMin)}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{plan.done === plan.total ? "All of today's tasks are done." : "No open tasks left for today"}</p>
          )}
          <p className="mt-3 text-[11px] text-muted">
            {plan.done} of {plan.total} complete ·{" "}
            <Link href="/planner" className="font-semibold text-primary hover:underline">
              Open plan
            </Link>
          </p>
        </>
      )}
    </HomeCard>
  );
}
