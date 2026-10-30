"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Tabs, tabId, tabPanelId } from "@/components/ui/Tabs";
import type { PlannerViewId } from "@/lib/planner-views";

const TABS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "backlog", label: "Backlog" },
  { id: "goals", label: "Goals" },
];
const PREFIX = "planner";

/** URL-driven tab bar (`?view=`); the active view renders as the tab panel. */
export function PlannerTabs({ view, children }: { view: PlannerViewId; children: ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4">
      <Tabs label="Planner views" tabs={TABS} value={view} idPrefix={PREFIX} onChange={(id) => router.push(`/planner?view=${id}`)} />
      <div role="tabpanel" id={tabPanelId(PREFIX, view)} aria-labelledby={tabId(PREFIX, view)}>
        {children}
      </div>
    </div>
  );
}
