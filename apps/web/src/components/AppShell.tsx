"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { UserView } from "@/lib/types";
import { AskAiPanel } from "./AskAiPanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ user, children }: { user: UserView; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [navOpen, setNavOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const askButtonRef = useRef<HTMLButtonElement>(null);
  const wasAskOpen = useRef(false);

  // Close the mobile drawer on navigation (adjust state during render on path change).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setNavOpen(false);
  }

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  useEffect(() => {
    if (wasAskOpen.current && !askOpen) askButtonRef.current?.focus();
    wasAskOpen.current = askOpen;
  }, [askOpen]);

  const closeAsk = useCallback(() => setAskOpen(false), []);

  return (
    <div className="flex h-screen bg-bg">
      {navOpen ? (
        <div aria-hidden="true" className="fixed inset-0 z-30 bg-text/30 md:hidden" onClick={() => setNavOpen(false)} />
      ) : null}
      <aside
        id="app-sidebar"
        data-open={navOpen}
        className={`fixed inset-y-0 left-0 z-40 w-[244px] shrink-0 bg-sidebar transition-transform md:static md:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar pathname={pathname} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          ref={askButtonRef}
          user={user}
          navOpen={navOpen}
          onToggleNav={() => setNavOpen((o) => !o)}
          onAskAi={() => setAskOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-bg p-4 md:p-6">{children}</main>
      </div>
      <AskAiPanel open={askOpen} onClose={closeAsk} />
    </div>
  );
}
