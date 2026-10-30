// Neutral (no "use client") so both the server planner page and the client PlannerTabs can use the real value.
export const PLANNER_VIEWS = ["today", "week", "month", "backlog", "goals"] as const;
export type PlannerViewId = (typeof PLANNER_VIEWS)[number];

export function isPlannerView(v: string | undefined): v is PlannerViewId {
  return (PLANNER_VIEWS as readonly string[]).includes(v ?? "");
}
