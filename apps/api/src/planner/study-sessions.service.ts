import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, getTableColumns, gte, inArray, isNull, lt, SQL, sql } from 'drizzle-orm';
import { AppError } from '../common/errors';
import { DB, Db } from '../db/db.module';
import { newId } from '../db/ids';
import { studySessions, syllabusNodes, tasks } from '../db/schema';
import { TasksService } from './tasks.service';

/** Most seconds one heartbeat can credit, however long the gap since the previous one. */
export const HEARTBEAT_MAX_CREDIT_S = 60;
/** A running or paused session with no heartbeat for longer than this is stale and offered for recovery. */
export const STALE_AFTER_S = 600;

type Row = typeof studySessions.$inferSelect;
type Status = Row['status'];
type Patch = Partial<Record<keyof typeof studySessions.$inferInsert, unknown>>;

export interface SessionView {
  id: string;
  status: Status;
  plannedMin: number;
  startedAt: string;
  activeSeconds: number;
  pausedSeconds: number;
  idleSeconds: number;
  taskId: string | null;
  subjectNodeId: string | null;
  stale: boolean;
  endedAt: string | null;
  endReason: Row['endReason'];
  focusRating: number | null;
  notes: string | null;
}

export interface StartInput {
  plannedMin: number;
  taskId?: string;
  subjectNodeId?: string;
}

export interface EndInput {
  focusRating?: number;
  notes?: string;
  completeTask?: boolean;
}

export type RecoverAction = 'resume' | 'end' | 'discard';

const s = studySessions;
const ACTIVE: Status[] = ['running', 'paused'];
const isActive = inArray(s.status, ACTIVE);
// All time arithmetic uses the database clock (now()), never a client-supplied time.
const staleSql = sql`(now() - ${s.lastHeartbeatAt} > make_interval(secs => ${sql.raw(String(STALE_AFTER_S))}))`;
const cols = {
  ...getTableColumns(studySessions),
  stale: sql<boolean>`(${s.status} in ('running', 'paused') and ${staleSql})`,
};
/** Seconds since the last heartbeat, capped, never negative. Evaluated against the row being updated. */
const gap = sql`greatest(0, least(${sql.raw(String(HEARTBEAT_MAX_CREDIT_S))}, round(extract(epoch from (now() - ${s.lastHeartbeatAt})))))::int`;
const touch = sql`greatest(${s.lastHeartbeatAt}, now())`;

const iso = (d: Date | string | null): string | null => (d === null ? null : new Date(d).toISOString());

function view(r: Row & { stale: boolean }): SessionView {
  return {
    id: r.id,
    status: r.status,
    plannedMin: r.plannedMin,
    startedAt: iso(r.startedAt)!,
    activeSeconds: r.activeSeconds,
    pausedSeconds: r.pausedSeconds,
    idleSeconds: r.idleSeconds,
    taskId: r.taskId,
    subjectNodeId: r.subjectNodeId,
    stale: r.stale === true,
    endedAt: iso(r.endedAt),
    endReason: r.endReason,
    focusRating: r.focusRating,
    notes: r.notes,
  };
}

function isUniqueViolation(e: unknown): boolean {
  for (let cur: unknown = e, depth = 0; cur && depth < 5; cur = (cur as { cause?: unknown }).cause, depth++) {
    if ((cur as { code?: unknown }).code === '23505') return true;
  }
  return false;
}

const notFound = () => new AppError(404, 'not_found', 'Study session not found');

@Injectable()
export class StudySessionsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly tasks: TasksService,
  ) {}

  private mine(userId: string, id: string): SQL {
    return and(eq(s.userId, userId), eq(s.id, id))!;
  }

  async active(userId: string): Promise<SessionView | null> {
    const [r] = await this.db.select(cols).from(s).where(and(eq(s.userId, userId), isActive)).limit(1);
    return r ? view(r) : null;
  }

  async start(userId: string, input: StartInput): Promise<SessionView> {
    let subjectNodeId = input.subjectNodeId ?? null;
    if (input.taskId) {
      const [t] = await this.db
        .select({ subjectNodeId: tasks.subjectNodeId })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.id, input.taskId), isNull(tasks.deletedAt)))
        .limit(1);
      if (!t) throw new AppError(400, 'validation_failed', 'taskId: unknown task');
      subjectNodeId ??= t.subjectNodeId;
    }
    if (input.subjectNodeId) {
      const [n] = await this.db.select({ id: syllabusNodes.id }).from(syllabusNodes).where(eq(syllabusNodes.id, input.subjectNodeId));
      if (!n) throw new AppError(400, 'validation_failed', 'subjectNodeId: unknown syllabus node');
    }
    try {
      // The unique partial index (one running/paused session per user) arbitrates concurrent starts.
      const [r] = await this.db
        .insert(s)
        .values({ id: newId(), userId, plannedMin: input.plannedMin, taskId: input.taskId ?? null, subjectNodeId })
        .returning(cols);
      return view(r);
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      throw new AppError(409, 'session_conflict', 'Another study session is already active', {
        active: await this.active(userId),
      });
    }
  }

  /**
   * One conditional UPDATE … RETURNING: the row lock taken by UPDATE serialises concurrent calls, and the
   * second one re-reads the row the first wrote, so the same interval is never credited twice.
   */
  private async transition(
    userId: string,
    id: string,
    from: Status[],
    set: Patch,
    extra?: SQL,
    opts: { rejectStale?: boolean } = {},
  ): Promise<SessionView> {
    const [r] = await this.db
      .update(s)
      .set(set as never)
      .where(and(this.mine(userId, id), inArray(s.status, from), extra))
      .returning(cols);
    if (r) return view(r);
    // Classify the miss only; the row was not modified.
    const [cur] = await this.db.select({ stale: cols.stale }).from(s).where(this.mine(userId, id)).limit(1);
    if (!cur) throw notFound();
    if (opts.rejectStale && cur.stale === true) {
      throw new AppError(409, 'session_stale', 'The study session went stale; recover it before continuing');
    }
    throw new AppError(409, 'invalid_state', 'The study session cannot do that in its current state');
  }

  heartbeat(userId: string, id: string, interacted: boolean): Promise<SessionView> {
    const set: Patch = {
      pausedSeconds: sql`${s.pausedSeconds} + case when ${s.status} = 'paused' then ${gap} else 0 end`,
      lastHeartbeatAt: touch,
    };
    if (interacted) set.activeSeconds = sql`${s.activeSeconds} + case when ${s.status} = 'running' then ${gap} else 0 end`;
    else set.idleSeconds = sql`${s.idleSeconds} + case when ${s.status} = 'running' then ${gap} else 0 end`;
    // A stale session is never silently revived by a heartbeat: it must go through recover.
    return this.transition(userId, id, ACTIVE, set, sql`not ${staleSql}`, { rejectStale: true });
  }

  /** Pause and resume do not credit the time since the last heartbeat. */
  pause(userId: string, id: string): Promise<SessionView> {
    return this.transition(userId, id, ['running'], { status: 'paused', lastHeartbeatAt: touch });
  }

  resume(userId: string, id: string): Promise<SessionView> {
    return this.transition(userId, id, ['paused'], { status: 'running', lastHeartbeatAt: touch });
  }

  /**
   * Time since the last heartbeat is not credited; clients send a final heartbeat before ending.
   * A stale session ends at its last heartbeat (as recover:end does), a fresh one at now().
   */
  async end(userId: string, id: string, input: EndInput): Promise<SessionView> {
    const ended = await this.transition(userId, id, ACTIVE, {
      status: 'ended',
      endedAt: sql`case when ${staleSql} then ${s.lastHeartbeatAt} else now() end`,
      endReason: sql`case when ${s.activeSeconds} >= ${s.plannedMin} * 60 then 'target_reached' else 'user' end`,
      focusRating: input.focusRating ?? null,
      notes: input.notes ?? null,
    });
    if (input.completeTask && ended.taskId) {
      try {
        await this.tasks.complete(userId, ended.taskId, { actualMin: Math.round(ended.activeSeconds / 60) });
      } catch (e) {
        // The task was deleted meanwhile: the session still ends.
        if (!(e instanceof AppError && e.code === 'not_found')) throw e;
      }
    }
    return ended;
  }

  discard(userId: string, id: string): Promise<SessionView> {
    return this.transition(userId, id, ACTIVE, { status: 'discarded', endReason: 'discarded', endedAt: sql`now()` });
  }

  /** Only for stale sessions. `end` closes the session at its last heartbeat without crediting the gap. */
  recover(userId: string, id: string, action: RecoverAction): Promise<SessionView> {
    const set: Patch =
      action === 'resume'
        ? { status: 'running', lastHeartbeatAt: touch }
        : action === 'end'
          ? { status: 'ended', endReason: 'recovered', endedAt: sql`${s.lastHeartbeatAt}` }
          : { status: 'discarded', endReason: 'discarded', endedAt: sql`now()` };
    return this.transition(userId, id, ACTIVE, set, staleSql);
  }

  async list(userId: string, q: { from?: Date; to?: Date; limit: number }): Promise<SessionView[]> {
    const rows = await this.db
      .select(cols)
      .from(s)
      .where(
        and(
          eq(s.userId, userId),
          eq(s.status, 'ended'),
          q.from ? gte(s.startedAt, q.from) : undefined,
          q.to ? lt(s.startedAt, q.to) : undefined,
        ),
      )
      .orderBy(desc(s.startedAt), desc(s.id))
      .limit(q.limit);
    return rows.map(view);
  }

  /** Whole minutes of active study in ended sessions that started in [from, to). */
  async recordedMinutes(userId: string, from: Date, to: Date): Promise<number> {
    const [r] = await this.db
      .select({ secs: sql<number>`coalesce(sum(${s.activeSeconds}), 0)::int` })
      .from(s)
      .where(and(eq(s.userId, userId), eq(s.status, 'ended'), gte(s.startedAt, from), lt(s.startedAt, to)));
    return Math.floor(Number(r?.secs ?? 0) / 60);
  }
}
