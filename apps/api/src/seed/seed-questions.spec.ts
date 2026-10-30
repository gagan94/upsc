import { validateImportRow } from '../practice/import';
import { loadQuestions, questionRow } from './seed-questions';
import { loadSyllabus } from './seed-catalog';

describe('seed-data/questions.json', () => {
  const qs = loadQuestions();
  const nodeSlugs = new Set(loadSyllabus().map((n) => n.slug));

  it('has exactly 100 questions with the planned subject distribution', () => {
    expect(qs).toHaveLength(100);
    const by: Record<string, number> = {};
    for (const q of qs) by[q.subject] = (by[q.subject] ?? 0) + 1;
    expect(by).toEqual({
      'prelims-polity': 20,
      'prelims-history': 15,
      'prelims-geography': 15,
      'prelims-economy': 15,
      'prelims-environment': 15,
      'prelims-science-technology': 10,
      'prelims-csat': 10,
    });
    for (const q of qs) expect(nodeSlugs.has(q.subject)).toBe(true);
  });

  it('has unique slugs and every question passes the importer (including duplicate stems)', () => {
    expect(new Set(qs.map((q) => q.slug)).size).toBe(qs.length);
    const seen = new Set<string>();
    for (const q of qs) {
      const r = validateImportRow(questionRow(q, '00000000-0000-4000-8000-000000000000'), seen);
      expect({ slug: q.slug, r: 'error' in r ? r.error : 'ok' }).toEqual({ slug: q.slug, r: 'ok' });
    }
  });

  it('has at least 25 statements questions and a 40/40/20 difficulty mix', () => {
    expect(qs.filter((q) => q.format === 'statements').length).toBeGreaterThanOrEqual(25);
    const d = (k: string) => qs.filter((q) => q.difficulty === k).length;
    expect(d('easy')).toBeGreaterThanOrEqual(36);
    expect(d('easy')).toBeLessThanOrEqual(44);
    expect(d('medium')).toBeGreaterThanOrEqual(36);
    expect(d('medium')).toBeLessThanOrEqual(44);
    expect(d('hard')).toBeGreaterThanOrEqual(16);
    expect(d('hard')).toBeLessThanOrEqual(24);
  });

  it('varies the statements answer key so it cannot be pattern-matched', () => {
    const st = qs.filter((q) => q.format === 'statements');
    const n = (k: string) => st.filter((q) => q.correctOption === k).length;
    expect(n('B')).toBeGreaterThanOrEqual(5);
    expect(n('D')).toBeGreaterThanOrEqual(2);
    expect((n('A') + n('C')) / st.length).toBeLessThanOrEqual(0.55);
  });

  it('has non-empty explanations, reasoning for A-D and a misconception on a wrong option', () => {
    for (const q of qs) {
      expect(q.explanation.trim().length).toBeGreaterThan(0);
      for (const k of ['A', 'B', 'C', 'D'] as const) expect(q.optionReasoning[k]?.trim().length ?? 0).toBeGreaterThan(0);
      expect(q.misconception.text.trim().length).toBeGreaterThan(0);
      expect(q.misconception.option).not.toBe(q.correctOption);
    }
  });

  it('carries no previous-year fields', () => {
    for (const q of qs) expect(Object.keys(q).filter((k) => k.toLowerCase().startsWith('pyq'))).toEqual([]);
  });
});
