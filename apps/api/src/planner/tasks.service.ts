import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, gte, lt, sql } from 'drizzle-orm';
import { AppError } from '../common/errors';
import { DB, Db } from '../db/db.module';
import { newId } from '../db/ids';
import { syllabusNodes, tasks } from '../db/schema';
import type { TaskLink } from '../db/schema/planner';

type Row = typeof tasks.$inferSelect;

export interface TaskView {
  id: string;
  title: string;
  subjectNodeId: string | null;
  subjectTitle: string | null;
  activityType: Row['activityType'];
  durationMin: number | null;
  scheduledStart: string | null;
  priority: Row['priority'];
  status: Row['status'];
  completedAt: string | null;
  actualMin: number | null;
  source: Row['source'];
  linked: TaskLink | null;
  notes: string | null;
}

export interface NewTask {
  title: string;
  subjectNodeId?: string | null;
  activityType?: Row['activityType'];
  durationMin?: number | null;
  scheduledStart?: Date | null;
  priority?: Row['priority'];
  linked?: TaskLink | null;
  notes?: string | null;
}

export type TaskPatch = Partial<NewTask>;

const notDeleted = (userId: string) => and(eq(tasks.userId, userId), isNull(tasks.deletedAt));

@Injectable()
export class TasksService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private select() {
    return this.db
      .select({ t: tasks, subjectTitle: syllabusNodes.title })
      .from(tasks)
      .leftJoin(syllabusNodes, eq(syllabusNodes.id, tasks.subjectNodeId));
  }

  private view(r: { t: Row; subjectTitle: string | null }): TaskView {
    const t = r.t;
    return {
      id: t.id,
      title: t.title,
      subjectNodeId: t.subjectNodeId,
      subjectTitle: r.subjectTitle ?? null,
      activityType: t.activityType,
      durationMin: t.durationMin,
      scheduledStart: t.scheduledStart ? t.scheduledStart.toISOString() : null,
      priority: t.priority,
      status: t.status,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      actualMin: t.actualMin,
      source: t.source,
      linked: (t.linked as TaskLink | null) ?? null,
      notes: t.notes,
    };
  }

  private async assertSubject(ids: (string | null | undefined)[]): Promise<void> {
    const wanted = [...new Set(ids.filter((x): x is string => !!x))];
    if (!wanted.length) return;
    const found = await this.db.select({ id: syllabusNodes.id }).from(syllabusNodes).where(inArray(syllabusNodes.id, wanted));
    if (found.length !== wanted.length) throw new AppError(400, 'validation_failed', 'subjectNodeId: unknown syllabus node');
  }

  async create(userId: string, input: NewTask): Promise<TaskView> {
    const [v] = await this.createMany(userId, [input], 'manual');
    return v;
  }

  async createMany(userId: string, inputs: NewTask[], source: Row['source']): Promise<TaskView[]> {
    if (!inputs.length) return [];
    await this.assertSubject(inputs.map((i) => i.subjectNodeId));
    const ids = inputs.map(() => newId());
    await this.db.insert(tasks).values(
      inputs.map((i, n) => ({
        id: ids[n],
        userId,
        title: i.title,
        subjectNodeId: i.subjectNodeId ?? null,
        activityType: i.activityType ?? 'other',
        durationMin: i.durationMin ?? null,
        scheduledStart: i.scheduledStart ?? null,
        priority: i.priority ?? 'normal',
        source,
        linked: i.linked ?? null,
        notes: i.notes ?? null,
      })),
    );
    const rows = await this.select().where(and(notDeleted(userId), inArray(tasks.id, ids)));
    const byId = new Map(rows.map((r) => [r.t.id, this.view(r)]));
    return ids.map((id) => byId.get(id)!);
  }

  async list(userId: string, range: { from: Date; to: Date }): Promise<TaskView[]> {
    const rows = await this.select()
      .where(and(notDeleted(userId), gte(tasks.scheduledStart, range.from), lt(tasks.scheduledStart, range.to)))
      .orderBy(asc(tasks.scheduledStart), asc(tasks.id));
    return rows.map((r) => this.view(r));
  }

  /** Open tasks scheduled before `before` (completed and skipped are not overdue). */
  async overdue(userId: string, before: Date): Promise<TaskView[]> {
    const rows = await this.select()
      .where(and(notDeleted(userId), lt(tasks.scheduledStart, before), inArray(tasks.status, ['todo', 'in_progress'])))
      .orderBy(asc(tasks.scheduledStart), asc(tasks.id));
    return rows.map((r) => this.view(r));
  }

  async unscheduled(userId: string): Promise<TaskView[]> {
    const rows = await this.select()
      .where(and(notDeleted(userId), isNull(tasks.scheduledStart)))
      .orderBy(asc(tasks.createdAt), asc(tasks.id));
    return rows.map((r) => this.view(r));
  }

  async unscheduledCount(userId: string): Promise<number> {
    const [r] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(notDeleted(userId), isNull(tasks.scheduledStart)));
    return r?.n ?? 0;
  }

  async get(userId: string, id: string): Promise<TaskView> {
    const [r] = await this.select().where(and(notDeleted(userId), eq(tasks.id, id))).limit(1);
    if (!r) throw new AppError(404, 'not_found', 'Task not found');
    return this.view(r);
  }

  private async mutate(userId: string, id: string, set: Partial<typeof tasks.$inferInsert>): Promise<TaskView> {
    const updated = await this.db
      .update(tasks)
      .set({ ...set, updatedAt: new Date() })
      .where(and(notDeleted(userId), eq(tasks.id, id)))
      .returning({ id: tasks.id });
    if (!updated.length) throw new AppError(404, 'not_found', 'Task not found');
    return this.get(userId, id);
  }

  async update(userId: string, id: string, patch: TaskPatch): Promise<TaskView> {
    await this.assertSubject([patch.subjectNodeId]);
    const set: Partial<typeof tasks.$inferInsert> = {};
    if (patch.title !== undefined) set.title = patch.title;
    if (patch.subjectNodeId !== undefined) set.subjectNodeId = patch.subjectNodeId;
    if (patch.activityType !== undefined) set.activityType = patch.activityType;
    if (patch.durationMin !== undefined) set.durationMin = patch.durationMin;
    if (patch.scheduledStart !== undefined) set.scheduledStart = patch.scheduledStart;
    if (patch.priority !== undefined) set.priority = patch.priority;
    if (patch.linked !== undefined) set.linked = patch.linked;
    if (patch.notes !== undefined) set.notes = patch.notes;
    return this.mutate(userId, id, set);
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const now = new Date();
    const r = await this.db
      .update(tasks)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(notDeleted(userId), eq(tasks.id, id)))
      .returning({ id: tasks.id });
    if (!r.length) throw new AppError(404, 'not_found', 'Task not found');
  }

  complete(userId: string, id: string, input: { actualMin?: number } = {}): Promise<TaskView> {
    const set: Partial<typeof tasks.$inferInsert> = { status: 'completed', completedAt: new Date() };
    if (input.actualMin !== undefined) set.actualMin = input.actualMin;
    return this.mutate(userId, id, set);
  }

  skip(userId: string, id: string): Promise<TaskView> {
    return this.mutate(userId, id, { status: 'skipped', completedAt: null });
  }

  reschedule(userId: string, id: string, input: { scheduledStart: Date | null }): Promise<TaskView> {
    return this.mutate(userId, id, { scheduledStart: input.scheduledStart });
  }
}
