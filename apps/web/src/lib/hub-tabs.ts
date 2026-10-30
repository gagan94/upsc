// Neutral (no "use client") so both the server prelims page and the client HubTabs can use the real value.
export const HUB_TABS = ["practice", "pyq", "bookmarks", "mistakes", "attempts"] as const;
export type HubTabId = (typeof HUB_TABS)[number];

export function isHubTab(v: string | undefined): v is HubTabId {
  return (HUB_TABS as readonly string[]).includes(v ?? "");
}
