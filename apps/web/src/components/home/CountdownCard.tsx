import type { HomeView } from "@/lib/types";

const LABEL = { prelims: "Prelims", mains: "Mains" } as const;

/** "Prelims: N days · Mains: N days · Illustrative targets". Omitted when there are no upcoming dates. */
export function CountdownCard({ countdown }: { countdown: HomeView["countdown"] }) {
  if (countdown.length === 0) return null;
  const parts = countdown.map((c) => `${LABEL[c.exam]}: ${c.daysLeft === 0 ? "Today" : c.daysLeft === 1 ? "1 day" : `${c.daysLeft} days`}`);
  if (countdown.some((c) => c.illustrative)) parts.push("Illustrative targets");
  return <p className="mt-1 text-sm text-muted">{parts.join(" · ")}</p>;
}
