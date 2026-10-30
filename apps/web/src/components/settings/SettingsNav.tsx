"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_SECTIONS } from "@/lib/settings-sections";

export function SettingsNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Settings sections">
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {SETTINGS_SECTIONS.map((s) => {
          const current = pathname === s.href;
          return (
            <li key={s.href} className="shrink-0">
              <Link
                href={s.href}
                aria-current={current ? "page" : undefined}
                className={`block rounded-control px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary ${
                  current ? "bg-primary text-primary-text" : "text-text hover:bg-bg"
                }`}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
