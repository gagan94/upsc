import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB, Db } from '../db/db.module';

export interface SubjectSummary {
  id: string;
  slug: string;
  title: string;
  gsPaper: string;
  moduleCount: number;
  lessonCount: number;
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
}
