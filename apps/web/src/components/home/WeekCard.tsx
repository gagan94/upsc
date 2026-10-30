import { formatMinutes } from "@/lib/format";
import type { HomeView } from "@/lib/types";
import { HomeCard } from "./HomeCard";
import { ProgressBar } from "./ProgressBar";

export function WeekCard({ week }: { week: HomeView["week"] }) {
  const percent = week.goalMin > 0 ? Math.min(100, Math.round((week.recordedMin / week.goalMin) * 100)) : 0;
  return (
    <HomeCard id="week-heading" title="This week">
      <p className="text-sm">
        {week.goalMin > 0
          ? `${formatMinutes(week.recordedMin)} of ${formatMinutes(week.goalMin)} goal`
          : `${formatMinutes(week.recordedMin)} studied`}
      </p>
      {week.goalMin > 0 ? (
        <div className="mt-2">
          <ProgressBar percent={percent} label="Weekly study goal" />
        </div>
      ) : null}
      <p className="mt-2 text-[11px] text-muted">
        {week.goalMin > 0 ? `${percent}% · ` : ""}
        {week.tasksDone} of {week.tasksTotal} tasks · {week.streakDays > 0 ? `${week.streakDays}-day streak` : "No streak yet"}
      </p>
    </HomeCard>
  );
}
