"use client";

import { useEffect, useRef } from "react";

const outline = "w-full rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text";

export function AskAiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden="true" className="absolute inset-0 bg-text/30" onClick={onClose} />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-ai-title"
        tabIndex={-1}
        className="relative flex h-full w-full flex-col gap-4 overflow-y-auto bg-surface p-6 outline-none md:w-[420px]"
      >
        <h2 id="ask-ai-title" className="text-lg font-bold text-text">
          Ask AI
        </h2>
        <p className="text-sm text-text">Ask about the material in view. Close to return to the same screen.</p>
        <p className="text-sm text-muted">No study material attached</p>
        <div className="flex flex-col gap-2">
          <button type="button" className="w-full rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-text">
            Explain this material
          </button>
          <button type="button" className={outline}>
            Choose context
          </button>
          <button type="button" className={outline}>
            Open full workspace
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-control border border-danger-border bg-danger-bg px-4 py-2 text-sm font-semibold text-danger"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
