import { DEFAULT_MARKING, scoreAnswers } from './scoring';

const set = (spec: string): { selected: string | null; correctOption: string }[] =>
  // 'c' = correct, 'w' = wrong, '-' = skipped; the key is always 'A'
  [...spec].map((ch) => ({ selected: ch === 'c' ? 'A' : ch === 'w' ? 'B' : null, correctOption: 'A' }));

describe('scoreAnswers', () => {
  it('3 correct + 2 wrong + 5 skipped with +2/-0.66 scores 4.68 at 0.6 accuracy', () => {
    const r = scoreAnswers(set('cccww-----'), { correct: 2, incorrect: -0.66 }, 'test');
    expect(r).toMatchObject({ correct: 3, incorrect: 2, skipped: 5, score: 4.68, accuracy: 0.6 });
    expect(r.perQuestion.map((p) => p.correct)).toEqual([true, true, true, false, false, null, null, null, null, null]);
    expect(r.perQuestion.map((p) => p.marks)).toEqual([2, 2, 2, -0.66, -0.66, 0, 0, 0, 0, 0]);
  });

  it('all skipped scores 0 with accuracy 0 (never NaN)', () => {
    const r = scoreAnswers(set('-----'), DEFAULT_MARKING, 'test');
    expect(r).toMatchObject({ correct: 0, incorrect: 0, skipped: 5, score: 0, accuracy: 0 });
    expect(Number.isNaN(r.accuracy)).toBe(false);
  });

  it('learning mode has no score, only accuracy', () => {
    const r = scoreAnswers(set('cw'), DEFAULT_MARKING, 'learning');
    expect(r.score).toBeNull();
    expect(r.accuracy).toBe(0.5);
    expect(r.perQuestion.map((p) => p.marks)).toEqual([0, 0]);
  });

  it('a perfect run scores 2 x N', () => {
    expect(scoreAnswers(set('c'.repeat(20)), DEFAULT_MARKING, 'test')).toMatchObject({ score: 40, accuracy: 1 });
  });

  it('rounds the score to 2 decimals', () => {
    // 7 wrong at -0.66 = -4.62 exactly, without float noise
    expect(scoreAnswers(set('wwwwwww'), DEFAULT_MARKING, 'test').score).toBe(-4.62);
    expect(scoreAnswers(set('cw'), { correct: 1, incorrect: -1 / 3 }, 'test').score).toBe(0.67);
  });

  it('the default marking is GS Paper I: +2 / -0.66', () => {
    expect(DEFAULT_MARKING).toEqual({ correct: 2, incorrect: -0.66 });
  });
});
