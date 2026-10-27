import { join } from 'path';
import { readFileSync } from 'fs';
import type { Db } from '../db/db.module';
import { activities, lessons, modules, subjects, syllabusNodes } from '../db/schema';
import type { SeedContext } from './run-seed';
import { seedId } from './ids';

export interface SyllabusSeed {
  slug: string;
  parent: string | null;
  title: string;
  examStage: string;
  paper: string;
  level: number;
  order: number;
}
export interface ActivitySeed {
  type: 'lesson' | 'quiz' | 'assignment' | 'pyq_set' | 'revision' | 'resource';
  title: string;
  estMinutes: number;
  order: number;
}
export interface ModuleSeed {
  title: string;
  summary: string;
  order: number;
  activities: ActivitySeed[];
}
export interface SubjectSeed {
  slug: string;
  title: string;
  gsPaper: string;
  syllabusNode: string;
  description: string;
  order: number;
  modules: ModuleSeed[];
}
export interface LessonSeed {
  subject: string;
  module: number;
  activity: number;
  summary: string;
  verificationStatus: string;
  bodyBlocks: unknown[];
}

const read = <T>(file: string): T => JSON.parse(readFileSync(join(__dirname, '../../seed-data', file), 'utf8')) as T;

export const loadSyllabus = (): SyllabusSeed[] => read('syllabus.json');
export const loadSubjects = (): SubjectSeed[] => read('subjects.json');
export const loadLessons = (): LessonSeed[] => read('lessons.json');

export const syllabusId = (slug: string): string => seedId(`syllabus:${slug}`);
export const subjectId = (slug: string): string => seedId(`subject:${slug}`);
export const moduleId = (subject: string, order: number): string => seedId(`module:${subject}:${order}`);
export const activityId = (subject: string, module: number, order: number): string =>
  seedId(`activity:${subject}:${module}:${order}`);

/** Ids of every catalog row this seeder owns (used for the SeedReport). */
export function catalogIds(): { subjects: string[]; modules: string[]; activities: string[]; lessons: string[] } {
  const subs = loadSubjects();
  return {
    subjects: subs.map((s) => subjectId(s.slug)),
    modules: subs.flatMap((s) => s.modules.map((m) => moduleId(s.slug, m.order))),
    activities: subs.flatMap((s) => s.modules.flatMap((m) => m.activities.map((a) => activityId(s.slug, m.order, a.order)))),
    lessons: loadLessons().map((l) => activityId(l.subject, l.module, l.activity)),
  };
}

export async function seedCatalog(db: Db, _ctx: SeedContext): Promise<void> {
  const nodes = loadSyllabus();
  const nodeBySlug = new Map(nodes.map((n) => [n.slug, n]));
  const pathOf = (n: SyllabusSeed): string => (n.parent ? `${pathOf(nodeBySlug.get(n.parent) as SyllabusSeed)}/${n.slug}` : n.slug);
  for (const n of nodes) {
    const values = {
      parentId: n.parent ? syllabusId(n.parent) : null,
      path: pathOf(n),
      level: n.level,
      examStage: n.examStage,
      paper: n.paper,
      title: n.title,
      slug: n.slug,
      order: n.order,
      status: 'published',
    };
    await db.insert(syllabusNodes).values({ id: syllabusId(n.slug), ...values }).onConflictDoUpdate({ target: syllabusNodes.id, set: values });
  }

  for (const s of loadSubjects()) {
    const sv = {
      syllabusNodeId: syllabusId(s.syllabusNode),
      slug: s.slug,
      title: s.title,
      description: s.description,
      gsPaper: s.gsPaper,
      order: s.order,
      status: 'published',
    };
    await db.insert(subjects).values({ id: subjectId(s.slug), ...sv }).onConflictDoUpdate({ target: subjects.id, set: sv });
    for (const m of s.modules) {
      const mv = { subjectId: subjectId(s.slug), title: m.title, order: m.order, summary: m.summary, required: true, status: 'published' };
      await db.insert(modules).values({ id: moduleId(s.slug, m.order), ...mv }).onConflictDoUpdate({ target: modules.id, set: mv });
      for (const a of m.activities) {
        const av = {
          moduleId: moduleId(s.slug, m.order),
          type: a.type,
          title: a.title,
          order: a.order,
          required: true,
          estMinutes: a.estMinutes,
          status: 'published',
        };
        await db
          .insert(activities)
          .values({ id: activityId(s.slug, m.order, a.order), ...av })
          .onConflictDoUpdate({ target: activities.id, set: av });
      }
    }
  }

  const lessonActivities = new Set(
    loadSubjects().flatMap((s) =>
      s.modules.flatMap((m) => m.activities.filter((a) => a.type === 'lesson').map((a) => activityId(s.slug, m.order, a.order))),
    ),
  );
  for (const l of loadLessons()) {
    const id = activityId(l.subject, l.module, l.activity);
    if (!lessonActivities.has(id)) throw new Error(`lessons.json: ${l.subject}/${l.module}/${l.activity} is not a lesson activity`);
    const lv = { summary: l.summary, bodyBlocks: l.bodyBlocks, verificationStatus: l.verificationStatus, locale: 'en' };
    await db.insert(lessons).values({ activityId: id, ...lv }).onConflictDoUpdate({ target: lessons.activityId, set: lv });
  }
}
