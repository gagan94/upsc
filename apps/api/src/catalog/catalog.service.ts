import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { DB, Db } from '../db/db.module';
import { subjects } from '../db/schema';

export interface SubjectSummary {
  id: string;
  slug: string;
  title: string;
  gsPaper: string;
  moduleCount: number;
  lessonCount: number;
}

export interface PlanSubject {
  slug: string;
  title: string;
  syllabusNodeId: string;
}

@Injectable()
export class CatalogService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Published subjects with module/lesson counts, in a single aggregate query. */
  async listSubjects(): Promise<SubjectSummary[]> {
    const result = await this.db.execute(sql`
      SELECT s.id, s.slug, s.title, s.gs_paper AS "gsPaper",
             COUNT(DISTINCT m.id)::int AS "moduleCount",
             COUNT(DISTINCT l.activity_id)::int AS "lessonCount"
      FROM catalog.subjects s
      LEFT JOIN catalog.modules m ON m.subject_id = s.id AND m.status = 'published'
      LEFT JOIN catalog.activities a
        ON a.module_id = m.id AND a.type = 'lesson' AND a.status = 'published'
      LEFT JOIN catalog.lessons l ON l.activity_id = a.id
      WHERE s.status = 'published'
      GROUP BY s.id
      ORDER BY s."order", s.title
    `);
    return result.rows as unknown as SubjectSummary[];
  }

  /** Published subjects (slug, title, syllabus node), in catalog order; optionally only the given slugs. */
  async findBySlugs(slugs?: string[]): Promise<PlanSubject[]> {
    const rows = await this.db
      .select({ slug: subjects.slug, title: subjects.title, syllabusNodeId: subjects.syllabusNodeId })
      .from(subjects)
      .where(slugs ? and(eq(subjects.status, 'published'), inArray(subjects.slug, slugs)) : eq(subjects.status, 'published'))
      .orderBy(asc(subjects.order), asc(subjects.title));
    return rows;
  }
}
