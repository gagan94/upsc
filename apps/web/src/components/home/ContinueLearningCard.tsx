import { sampleContinue } from "@/lib/sample-data";
import { HomeCard } from "./HomeCard";
import { ProgressBar } from "./ProgressBar";

export function ContinueLearningCard() {
  return (
    <HomeCard id="continue-heading" title="Continue learning" className="md:col-span-2">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sampleContinue.map((c) => (
          <li key={c.title} className="flex flex-col gap-2 rounded-control border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{c.title}</span>
              <span className="text-[11px] font-semibold text-primary">{c.paper}</span>
            </div>
            <ProgressBar percent={c.percent} label={`${c.title} progress`} />
            <div className="flex justify-between text-[11px] text-muted">
              <span>{c.percent}%</span>
              <span>Resume</span>
            </div>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
