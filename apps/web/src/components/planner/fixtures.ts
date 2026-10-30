import type { TaskView, TodayView } from "@/lib/types";

export const task = (o: Partial<TaskView> = {}): TaskView => ({
  id: "t1",
  title: "Read Laxmikanth ch 3",
  subjectNodeId: null,
  subjectTitle: null,
  activityType: "reading",
  durationMin: 45,
  scheduledStart: "2026-10-14T04:30:00.000Z",
  priority: "normal",
  status: "todo",
  completedAt: null,
  actualMin: null,
  source: "manual",
  linked: null,
  notes: null,
  ...o,
});

export const today = (o: Partial<TodayView> = {}): TodayView => ({
  date: "2026-10-14",
  tasks: [task()],
  overdue: [],
  stats: { plannedMin: 45, recordedMin: 0, completed: 0, total: 1 },
  unscheduledCount: 0,
  overloaded: false,
  ...o,
});

/** `id` is the catalog subject id; `syllabusNodeId` is the id planner APIs take as `subjectNodeId` (deliberately different). */
export const subjects = [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", syllabusNodeId: "11111111-1111-4111-8111-111111111111", title: "Polity" }];
