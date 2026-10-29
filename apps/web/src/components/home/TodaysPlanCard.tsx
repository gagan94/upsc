import { sampleTasks, sampleTasksSummary } from "@/lib/sample-data";
import { HomeCard } from "./HomeCard";

export function TodaysPlanCard() {
  return (
    <HomeCard id="plan-heading" title="Today's plan">
      <ul className="flex flex-col gap-2">
        {sampleTasks.map((t) => (
          <li key={t.title} className="flex items-center justify-between gap-2 text-sm">
            <span>
              <span className="block text-[11px] font-semibold text-muted">{t.tag}</span>
              <span className={t.done ? "line-through" : ""}>{t.title}</span>
            </span>
            <span className="text-[11px] text-muted">{t.minutes} min</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted">{sampleTasksSummary}</p>
    </HomeCard>
  );
}
