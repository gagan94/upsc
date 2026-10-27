import { sampleHeadlines } from "@/lib/sample-data";
import { HomeCard } from "./HomeCard";

export function CurrentAffairsCard() {
  return (
    <HomeCard id="ca-heading" title="Today's current affairs">
      <ul className="flex flex-col gap-2 text-sm">
        {sampleHeadlines.map((h) => (
          <li key={h.title} className="flex items-center justify-between gap-2">
            <span>{h.title}</span>
            <span className="text-[11px] font-semibold text-primary">{h.paper}</span>
          </li>
        ))}
      </ul>
    </HomeCard>
  );
}
