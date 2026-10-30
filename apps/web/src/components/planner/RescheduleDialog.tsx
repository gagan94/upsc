"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { localTime, zonedInstant } from "@/lib/planner-time";
import { localDate } from "@/lib/time";
import type { TaskView } from "@/lib/types";
import { DEFAULT_TIME } from "./TaskDialog";

export function RescheduleDialog({
  open,
  onClose,
  task,
  tz,
  defaultDate,
  mode = "reschedule",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  task: TaskView;
  tz: string;
  defaultDate: string;
  mode?: "reschedule" | "schedule";
  /** `null` moves the task to the backlog. */
  onConfirm: (scheduledStart: string | null) => void;
}) {
  const label = mode === "schedule" ? "Schedule task" : "Reschedule task";
  return (
    <Modal open={open} onClose={onClose} title={label}>
      <Form label={label} task={task} tz={tz} defaultDate={defaultDate} onClose={onClose} onConfirm={onConfirm} />
    </Modal>
  );
}

function Form({
  label,
  task,
  tz,
  defaultDate,
  onClose,
  onConfirm,
}: {
  label: string;
  task: TaskView;
  tz: string;
  defaultDate: string;
  onClose: () => void;
  onConfirm: (iso: string | null) => void;
}) {
  const [date, setDate] = useState(task.scheduledStart ? localDate(new Date(task.scheduledStart), tz) : defaultDate);
  const [time, setTime] = useState(task.scheduledStart ? localTime(task.scheduledStart, tz) : DEFAULT_TIME);
  function submit(e: FormEvent) {
    e.preventDefault();
    onConfirm(date ? zonedInstant(date, time || DEFAULT_TIME, tz) : null);
    onClose();
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} hint="Clear the date to move to your backlog" />
        <Field label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">{label}</Button>
      </div>
    </form>
  );
}
