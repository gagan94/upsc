"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminSection {
  label: string;
  /** Present only for sections that are live in this phase. */
  href?: string;
  /** Roles that see this entry; defaults to admin only. */
  roles?: string[];
}

const EDITOR_ROLES = ["admin", "content_editor"];

/** v1 admin sections (spec 18 §3). Only entries with an href are live. */
export const ADMIN_SECTIONS: AdminSection[] = [
  { label: "Dashboard" },
  { label: "Content" },
  { label: "Questions", href: "/admin/questions", roles: EDITOR_ROLES },
  { label: "Question reports", href: "/admin/question-reports", roles: EDITOR_ROLES },
  { label: "News & sources" },
  { label: "Verification" },
  { label: "Resources & Acts" },
  { label: "Users", href: "/admin/users" },
  { label: "Plans & entitlements", href: "/admin/plans" },
  { label: "Mentors" },
  { label: "Payments" },
  { label: "Community" },
  { label: "Support" },
  { label: "AI" },
  { label: "Settings" },
  { label: "Audit log" },
];

/** `roles` filters the entries; omitted means an admin. */
export function AdminNav({ roles = ["admin"] }: { roles?: string[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex h-full flex-col gap-1 overflow-y-auto p-4">
      <ul className="flex flex-col gap-1">
        {ADMIN_SECTIONS.filter((s) => (s.roles ?? ["admin"]).some((r) => roles.includes(r))).map((s) => {
          if (s.href) {
            const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
            return (
              <li key={s.label}>
                <Link
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-control px-3 py-2 text-sm font-medium ${
                    active ? "bg-sidebar-active text-sidebar-active-text" : "text-sidebar-text hover:bg-white/5"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            );
          }
          return (
            <li key={s.label}>
              <div aria-disabled="true" className="cursor-not-allowed rounded-control px-3 py-2 text-sm text-sidebar-text/50">
                <span className="block font-medium">{s.label}</span>
                <span className="block text-[11px]">Coming in a later phase</span>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
