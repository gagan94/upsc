import { Banner } from "@/components/ui/Banner";

export function OverdueBanner({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Banner tone="warning" className="border-amber-400 bg-amber-50 text-amber-900">
      <p className="font-semibold">
        {count} overdue {count === 1 ? "task" : "tasks"}
      </p>
      <p>Reschedule, skip or complete</p>
    </Banner>
  );
}
