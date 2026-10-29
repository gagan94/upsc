"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import type { TaskView } from "@/lib/types";
import { RescheduleDialog } from "./RescheduleDialog";

export interface TaskHandlers {
  onComplete: (task: TaskView, actualMin?: number) => void;
  onSkip: (task: TaskView) => void;
  onReschedule: (task: TaskView, scheduledStart: string | null) => void;
  onEdit: (task: TaskView) => void;
  onDelete: (task: TaskView) => void;
}

/** Row actions menu (keyboard: Enter/Space/ArrowDown open, arrows move, Escape closes) plus its follow-up dialogs. */
export function TaskActions({
  task,
  tz,
  defaultDate,
  handlers,
}: {
  task: TaskView;
  tz: string;
  /** Date offered when rescheduling a task that has none. */
  defaultDate: string;
  handlers: TaskHandlers;
}) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"complete" | "reschedule" | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const isOpenTask = task.status === "todo" || task.status === "in_progress";

  const items: { label: string; run: () => void }[] = [
    ...(isOpenTask
      ? [
          { label: "Complete", run: () => setDialog("complete") },
          { label: "Skip", run: () => handlers.onSkip(task) },
        ]
      : []),
    { label: "Reschedule", run: () => setDialog("reschedule") },
    { label: "Edit", run: () => handlers.onEdit(task) },
    { label: "Delete", run: () => handlers.onDelete(task) },
  ];

  useEffect(() => {
    if (!open) return;
    const first = rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
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

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${task.title}`}
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
        className="rounded-control px-2 py-1 text-lg leading-none text-muted hover:bg-bg focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Actions for ${task.title}`}
          onKeyDown={onMenuKey}
          className="absolute right-0 z-20 mt-1 flex min-w-40 flex-col rounded-card border border-border bg-surface py-1 shadow-lg"
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                it.run();
              }}
              className={`px-3 py-2 text-left text-sm hover:bg-bg focus-visible:bg-bg focus-visible:outline-2 focus-visible:outline-primary ${
                it.label === "Delete" ? "text-danger" : "text-text"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
      <CompleteDialog
        open={dialog === "complete"}
        task={task}
        onClose={() => setDialog(null)}
        onConfirm={(m) => handlers.onComplete(task, m)}
      />
      <RescheduleDialog
        open={dialog === "reschedule"}
        task={task}
        tz={tz}
        defaultDate={defaultDate}
        onClose={() => setDialog(null)}
        onConfirm={(iso) => handlers.onReschedule(task, iso)}
      />
    </div>
  );
}

function CompleteDialog({
  open,
  task,
  onClose,
  onConfirm,
}: {
  open: boolean;
  task: TaskView;
  onClose: () => void;
  onConfirm: (actualMin?: number) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Complete task">
      <CompleteForm task={task} onClose={onClose} onConfirm={onConfirm} />
    </Modal>
  );
}

function CompleteForm({ task, onClose, onConfirm }: { task: TaskView; onClose: () => void; onConfirm: (m?: number) => void }) {
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (minutes === "") {
      onConfirm();
    } else {
      const n = Number(minutes);
      if (!Number.isInteger(n) || n < 0 || n > 1440) {
        setError("Enter whole minutes between 0 and 1440");
        return;
      }
      onConfirm(n);
    }
    onClose();
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <p className="text-sm text-muted">{task.title}</p>
      <Field
        label="Actual minutes (optional)"
        type="number"
        inputMode="numeric"
        min={0}
        max={1440}
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        error={error}
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Mark complete</Button>
      </div>
    </form>
  );
}
