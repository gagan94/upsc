"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Chips";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { localDate } from "@/lib/time";
import { localTime, zonedInstant } from "@/lib/planner-time";
import type { ActivityType, NewTask, TaskPriority, TaskView } from "@/lib/types";

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  reading: "Reading",
  revision: "Revision",
  practice_mcq: "Practice MCQs",
  answer_writing: "Answer writing",
  current_affairs: "Current affairs",
  notes: "Notes",
  mock_test: "Mock test",
  mentor_session: "Mentor session",
  other: "Other",
};
const PRIORITY_LABELS: Record<TaskPriority, string> = { low: "Low", normal: "Normal", high: "High" };
const PRESETS = [15, 30, 45, 60, 90, 120];
export const DEFAULT_TIME = "09:00";

/**
 * A catalog subject as listed by GET /learn/subjects. `id` is the catalog subject id;
 * `syllabusNodeId` is what every planner/study API expects as `subjectNodeId`.
 */
export interface SubjectOption {
  id: string;
  syllabusNodeId: string;
  title: string;
}
/** Fields sent to the API: all of NewTask on create, only the changed ones on edit. */
export type TaskFields = Partial<NewTask>;

export function TaskDialog({
  open,
  onClose,
  onSubmit,
  subjects,
  tz,
  task,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  /** Resolve true when saved (the dialog closes), false when it failed (stays open). */
  onSubmit: (fields: TaskFields) => Promise<boolean>;
  subjects: SubjectOption[];
  tz: string;
  task?: TaskView;
  defaultDate?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "Add a task"}>
      <TaskForm onClose={onClose} onSubmit={onSubmit} subjects={subjects} tz={tz} task={task} defaultDate={defaultDate} />
    </Modal>
  );
}

function TaskForm({
  onClose,
  onSubmit,
  subjects,
  tz,
  task,
  defaultDate,
}: {
  onClose: () => void;
  onSubmit: (fields: TaskFields) => Promise<boolean>;
  subjects: SubjectOption[];
  tz: string;
  task?: TaskView;
  defaultDate?: string;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [subject, setSubject] = useState(task?.subjectNodeId ?? "");
  const [activity, setActivity] = useState<string>(task?.activityType ?? "");
  const [duration, setDuration] = useState<string>(task?.durationMin ? String(task.durationMin) : "");
  const [date, setDate] = useState(task?.scheduledStart ? localDate(new Date(task.scheduledStart), tz) : (defaultDate ?? ""));
  const [time, setTime] = useState(task?.scheduledStart ? localTime(task.scheduledStart, tz) : "");
  const [priority, setPriority] = useState<string>(task?.priority ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const durationOptions = [
    { value: "", label: "None" },
    ...PRESETS.map((m) => ({ value: String(m), label: `${m} min` })),
  ];
  if (duration && !PRESETS.includes(Number(duration))) durationOptions.push({ value: duration, label: `${duration} min` });
  const subjectOptions = [{ value: "", label: "No subject" }, ...subjects.map((s) => ({ value: s.syllabusNodeId, label: s.title }))];
  if (task?.subjectNodeId && !subjects.some((s) => s.syllabusNodeId === task.subjectNodeId)) {
    subjectOptions.push({ value: task.subjectNodeId, label: task.subjectTitle ?? "Current subject" });
  }

  function build(): TaskFields {
    const t = title.trim();
    const start = date ? zonedInstant(date, time || DEFAULT_TIME, tz) : null;
    const dur = duration ? Number(duration) : null;
    const note = notes.trim() || null;
    const sub = subject || null;
    if (!task) {
      const f: TaskFields = { title: t };
      if (sub) f.subjectNodeId = sub;
      if (activity) f.activityType = activity as ActivityType;
      if (dur !== null) f.durationMin = dur;
      if (start) f.scheduledStart = start;
      if (priority) f.priority = priority as TaskPriority;
      if (note) f.notes = note;
      return f;
    }
    const f: TaskFields = {};
    if (t !== task.title) f.title = t;
    if (sub !== task.subjectNodeId) f.subjectNodeId = sub;
    if (activity && activity !== task.activityType) f.activityType = activity as ActivityType;
    if (dur !== task.durationMin) f.durationMin = dur;
    if (start !== task.scheduledStart) f.scheduledStart = start;
    if (priority && priority !== task.priority) f.priority = priority as TaskPriority;
    if (note !== task.notes) f.notes = note;
    return f;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError("Title is required");
      return;
    }
    setTitleError(null);
    setFailed(false);
    const fields = build();
    if (task && Object.keys(fields).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    const ok = await onSubmit(fields);
    setSaving(false);
    if (ok) onClose();
    else setFailed(true);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Field
        label="Title"
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
        error={titleError}
        hint="Leave the date blank to save in your backlog"
      />
      <Select
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        options={subjectOptions}
      />
      <Select
        label="Activity type"
        value={activity}
        onChange={(e) => setActivity(e.target.value)}
        options={[
          { value: "", label: "Not specified" },
          ...Object.entries(ACTIVITY_LABELS).map(([value, label]) => ({ value, label })),
        ]}
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-text">Duration</span>
        <Chips label="Duration" options={durationOptions} value={duration} onChange={setDuration} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Field label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <Select
        label="Priority"
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        options={[
          { value: "", label: "Default" },
          ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
        ]}
      />
      <Field label="Notes" multiline rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {failed ? (
        <p role="alert" className="text-sm font-semibold text-danger">
          Task save failed
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {task ? "Save task" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
