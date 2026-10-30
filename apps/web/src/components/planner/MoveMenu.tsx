"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatDayShort } from "@/lib/planner-time";

/** Keyboard-accessible "Move to…" menu (the no-drag-and-drop way to change a task's day). */
export function MoveMenu({
  title,
  days,
  currentDay,
  onMove,
}: {
  title: string;
  /** Candidate YYYY-MM-DD days. */
  days: string[];
  currentDay: string;
  /** `null` moves the task to the backlog. */
  onMove: (day: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const items = rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    const current = Array.from(items ?? []).find((el) => el.getAttribute("aria-current") === "true");
    (current ?? items?.[0])?.focus();
    function outside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }
  function onMenuKey(e: React.KeyboardEvent) {
    const els = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      els[(n + els.length) % els.length]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(els.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") setOpen(false);
  }

  const itemClass =
    "px-3 py-2 text-left text-sm text-text hover:bg-bg focus-visible:bg-bg focus-visible:outline-2 focus-visible:outline-primary";
  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Move ${title} to…`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="rounded-control px-2 py-0.5 text-xs font-semibold text-primary hover:bg-bg focus-visible:outline-2 focus-visible:outline-primary"
      >
        Move to…
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Move ${title} to`}
          onKeyDown={onMenuKey}
          className="absolute left-0 z-20 mt-1 flex min-w-40 flex-col rounded-card border border-border bg-surface py-1 shadow-lg"
        >
          {days.map((d) => (
            <button
              key={d}
              type="button"
              role="menuitem"
              aria-current={d === currentDay ? "true" : undefined}
              onClick={() => {
                close();
                if (d !== currentDay) onMove(d);
              }}
              className={`${itemClass} ${d === currentDay ? "font-semibold" : ""}`}
            >
              {formatDayShort(d, "UTC")}
              {d === currentDay ? " (current)" : ""}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onMove(null);
            }}
            className={`${itemClass} border-t border-border`}
          >
            Unscheduled (backlog)
          </button>
        </div>
      ) : null}
    </div>
  );
}
