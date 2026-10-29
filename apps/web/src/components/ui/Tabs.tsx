"use client";

import { useId, useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
}

/**
 * Tab list with automatic activation. Panels are the caller's: give the panel
 * `role="tabpanel"`, `id={tabPanelId(prefix, id)}` and `aria-labelledby={tabId(prefix, id)}`
 * using the same `idPrefix` passed here.
 */
export function Tabs({
  label,
  tabs,
  value,
  onChange,
  idPrefix,
  className = "",
}: {
  label: string;
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  idPrefix?: string;
  className?: string;
}) {
  const uid = useId();
  const prefix = idPrefix ?? uid;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function go(idx: number) {
    const n = (idx + tabs.length) % tabs.length;
    onChange(tabs[n].id);
    refs.current[n]?.focus();
  }
  return (
    <div role="tablist" aria-label={label} className={`flex gap-1 border-b border-border ${className}`}>
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(prefix, t.id)}
            aria-selected={on}
            aria-controls={tabPanelId(prefix, t.id)}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                go(i + 1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(i - 1);
              } else if (e.key === "Home") {
                e.preventDefault();
                go(0);
              } else if (e.key === "End") {
                e.preventDefault();
                go(tabs.length - 1);
              }
            }}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
              on ? "border-primary text-primary" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const tabPanelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;
