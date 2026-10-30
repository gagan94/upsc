"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Tabs, tabId, tabPanelId } from "@/components/ui/Tabs";

export const HUB_TABS = ["practice", "pyq", "bookmarks", "mistakes", "attempts"] as const;
export type HubTabId = (typeof HUB_TABS)[number];

const TABS = [
  { id: "practice", label: "Practice" },
  { id: "pyq", label: "PYQs" },
  { id: "bookmarks", label: "Bookmarks" },
  { id: "mistakes", label: "Mistakes" },
  { id: "attempts", label: "My attempts" },
];
const FUTURE = ["Mock tests", "CSAT", "Analytics", "Weekly challenge"];
const PREFIX = "prelims";

/** URL-driven tab bar (`?tab=`). Future-phase tabs are disabled buttons: never focusable, never links. */
export function HubTabs({ tab, children }: { tab: HubTabId; children: ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <Tabs label="Prelims sections" tabs={TABS} value={tab} idPrefix={PREFIX} onChange={(id) => router.push(`/prelims?tab=${id}`)} className="overflow-x-auto" />
        <div className="flex flex-wrap gap-1" aria-label="Coming later">
          {FUTURE.map((name) => (
            <button
              key={name}
              type="button"
              disabled
              title="Arrives in Phase 7"
              className="cursor-not-allowed rounded-control px-2 py-1 text-xs font-semibold text-muted opacity-60"
            >
              <span>{name}</span>
              <span className="sr-only"> (Arrives in Phase 7)</span>
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" id={tabPanelId(PREFIX, tab)} aria-labelledby={tabId(PREFIX, tab)}>
        {children}
      </div>
    </div>
  );
}
