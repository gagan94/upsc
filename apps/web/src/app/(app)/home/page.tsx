import { ContinueLearningCard } from "@/components/home/ContinueLearningCard";
import { CurrentAffairsCard } from "@/components/home/CurrentAffairsCard";
import { MentorshipCard } from "@/components/home/MentorshipCard";
import { RevisionCard } from "@/components/home/RevisionCard";
import { TodaysPlanCard } from "@/components/home/TodaysPlanCard";
import { WeekCard } from "@/components/home/WeekCard";
import { samplePlan } from "@/lib/sample-data";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <p role="note" className="rounded-control border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-muted">
        Sample data
      </p>
      <div>
        <h1 className="text-2xl font-bold text-text">Your preparation at a glance</h1>
        <span className="mt-2 inline-block rounded-control bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-text">
          {samplePlan.chip}
        </span>
        <p className="mt-1 text-sm text-muted">{samplePlan.subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-gap md:grid-cols-2">
        <ContinueLearningCard />
        <TodaysPlanCard />
        <CurrentAffairsCard />
        <RevisionCard />
        <MentorshipCard />
        <WeekCard />
      </div>
    </div>
  );
}
