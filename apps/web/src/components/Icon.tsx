import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  CircleHelp,
  GraduationCap,
  House,
  ListChecks,
  Menu,
  MessagesSquare,
  Newspaper,
  NotebookPen,
  RotateCcw,
  Search,
  SquarePen,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  house: House,
  "book-open": BookOpen,
  "notebook-pen": NotebookPen,
  "rotate-ccw": RotateCcw,
  newspaper: Newspaper,
  "list-checks": ListChecks,
  "square-pen": SquarePen,
  "calendar-days": CalendarDays,
  "chart-column": ChartColumn,
  "messages-square": MessagesSquare,
  "graduation-cap": GraduationCap,
  "circle-help": CircleHelp,
  "user-round": UserRound,
  bell: Bell,
  search: Search,
  menu: Menu,
  x: X,
  "chevron-down": ChevronDown,
};

export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return <Cmp aria-hidden="true" focusable="false" size={size} className={className} />;
}
