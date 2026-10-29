import { sampleWeek } from "@/lib/sample-data";
import { HomeCard } from "./HomeCard";
import { ProgressBar } from "./ProgressBar";

export function WeekCard() {
  return (
    <HomeCard id="week-heading" title="This week">
      <p className="text-sm">{sampleWeek.hours}</p>
      <div className="mt-2">
        <ProgressBar percent={sampleWeek.percent} label="Weekly study goal" />
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {sampleWeek.percent}% · {sampleWeek.tasks}
      </p>
    </HomeCard>
  );
}
