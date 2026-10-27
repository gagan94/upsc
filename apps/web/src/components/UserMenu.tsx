"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { UserView } from "@/lib/types";
import { Icon } from "./Icon";

const ENTRIES = [
  "My profile",
  "Preparation profile",
  "Study preferences",
  "Notifications",
  "Connected tools",
  "Appearance & accessibility",
  "Privacy & data",
  "Account & contact",
].map((label) => ({
  label,
  href: `/settings?section=${label
    .toLowerCase()
    .replace(/&/g, "")
    .trim()
    .split(/\s+/)
    .join("-")}`,
}));

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const itemClass = "block w-full rounded-control px-3 py-2 text-left text-sm text-text hover:bg-bg";

export function UserMenu({ user }: { user: UserView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  async function logOut() {
    setOpen(false);
    await createBrowserSupabase().auth.signOut();
    router.push("/login");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-control px-2 py-1 hover:bg-bg"
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-text"
        >
          {initialsOf(user.name)}
        </span>
        <span className="hidden flex-col text-left leading-tight sm:flex">
          <span className="text-sm font-semibold text-text">{user.name}</span>
          <span className="text-[11px] text-muted">UPSC aspirant</span>
        </span>
        <Icon name="chevron-down" size={16} className="text-muted" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Profile & Settings"
          className="absolute right-0 z-40 mt-2 w-60 rounded-card border border-border bg-surface p-2 shadow-lg"
        >
          {ENTRIES.map((e) => (
            <Link key={e.href} role="menuitem" href={e.href} className={itemClass} onClick={() => setOpen(false)}>
              {e.label}
            </Link>
          ))}
          {user.roles.includes("admin") ? (
            <Link role="menuitem" href="/admin" className={itemClass} onClick={() => setOpen(false)}>
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={logOut}
            className="mt-1 block w-full rounded-control px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger-bg"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
