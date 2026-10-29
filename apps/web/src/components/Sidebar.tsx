import Link from "next/link";
import { FOOTER_ITEMS, NAV_GROUPS, type NavItem } from "@/lib/nav";
import { Icon } from "./Icon";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium ${
        active ? "bg-sidebar-active text-sidebar-active-text" : "text-sidebar-text hover:bg-white/5"
      }`}
    >
      <Icon name={item.icon} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="px-3 py-2">
        <div className="text-2xl font-bold text-surface">AI UPSC</div>
        <div className="text-[11px] text-sidebar-text">Your preparation workspace</div>
      </div>
      <div className="flex flex-1 flex-col gap-4">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-sidebar-text/70">
              {g.label.toUpperCase()}
            </div>
            <div className="flex flex-col gap-0.5">
              {g.items.map((i) => (
                <NavLink key={i.key} item={i} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-0.5 border-t border-white/10 pt-3">
        {FOOTER_ITEMS.map((i) => (
          <NavLink key={i.key} item={i} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
