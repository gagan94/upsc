export interface NavItem {
  key: string;
  label: string;
  href: string;
  group: string;
  icon: string;
  figmaNode?: string;
  phase: number;
}

const item = (
  group: string,
  key: string,
  label: string,
  href: string,
  icon: string,
  phase: number,
  figmaNode?: string,
): NavItem => ({ key, label, href, group, icon, phase, figmaNode });

export const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  { label: "Overview", items: [item("Overview", "home", "Home", "/home", "house", 1, "89:3378")] },
  {
    label: "Study",
    items: [
      item("Study", "learn", "Learn", "/learn", "book-open", 8, "128:8481"),
      item("Study", "notes", "Notes", "/notes", "notebook-pen", 2, "129:12554"),
      item("Study", "revision", "Revision", "/revision", "rotate-ccw", 4, "149:15678"),
    ],
  },
  {
    label: "Current Affairs",
    items: [
      item("Current Affairs", "current-affairs", "Current Affairs", "/current-affairs", "newspaper", 2, "98:3939"),
      item("Current Affairs", "magazines", "Magazines & Resources", "/magazines", "newspaper", 7, "377:67108"),
      item("Current Affairs", "acts-bills", "Acts & Bills", "/acts-bills", "newspaper", 7, "377:70108"),
    ],
  },
  {
    label: "Practice",
    items: [
      item("Practice", "prelims", "Prelims", "/prelims", "list-checks", 1, "129:11196"),
      item("Practice", "mains", "Mains", "/mains", "square-pen", 4, "149:15935"),
    ],
  },
  {
    label: "Plan & Track",
    items: [
      item("Plan & Track", "planner", "Planner", "/planner", "calendar-days", 1, "128:8869"),
      item("Plan & Track", "progress", "Progress", "/progress", "chart-column", 4, "149:16195"),
      item("Plan & Track", "ask-ai", "Ask AI", "/ask-ai", "messages-square", 3, "149:16452"),
    ],
  },
  {
    label: "Community",
    items: [
      item("Community", "forum", "Forum", "/forum", "messages-square", 5, "108:5339"),
      item("Community", "mentorship", "Mentorship", "/mentorship", "graduation-cap", 6, "108:3825"),
    ],
  },
];

export const FOOTER_ITEMS: NavItem[] = [
  item("Footer", "help", "Help & Resources", "/help", "circle-help", 7, "153:16246"),
  item("Footer", "settings", "Profile & Settings", "/settings", "user-round", 1, "153:17134"),
];

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), ...FOOTER_ITEMS];

export function getNavItem(key: string): NavItem {
  const found = ALL_NAV_ITEMS.find((i) => i.key === key);
  if (!found) throw new Error(`Unknown nav item: ${key}`);
  return found;
}
