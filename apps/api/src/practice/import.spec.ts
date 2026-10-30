import { normalizeStem, validateImportRow } from './import';

const SUBJECT = '0197a5c0-0000-7000-8000-000000000001';
const valid = () => ({
  format: 'single',
  stem: 'Which article of the Constitution abolishes untouchability?',
  options: [
    { key: 'A', text: 'Article 15' },
    { key: 'B', text: 'Article 17' },
    { key: 'C', text: 'Article 19' },
    { key: 'D', text: 'Article 21' },
  ],
  correctOption: 'B',
  explanation: 'Article 17 abolishes untouchability.',
  optionReasoning: { A: 'a', B: 'b', C: 'c', D: 'd' },
  difficulty: 'easy',
  subjectNodeId: SUBJECT,
  gsPaper: 'GS1',
});
const err = (r: unknown) => (r as { error?: string }).error;

describe('validateImportRow', () => {
  it('accepts a valid single-answer row and applies defaults', () => {
    const r = validateImportRow(valid());
    expect(err(r)).toBeUndefined();
    expect(r).toMatchObject({ format: 'single', sourceType: 'platform', correctOption: 'B' });
  });

  it('accepts a statements row', () => {
    const r = validateImportRow({ ...valid(), format: 'statements', statements: ['One', 'Two'] });
    expect(err(r)).toBeUndefined();
  });

  it('rejects non-objects', () => {
    for (const bad of [null, undefined, 'x', 5, []]) expect(err(validateImportRow(bad))).toBeTruthy();
  });

  it('rejects a row with 3 options', () => {
    const row = { ...valid(), options: valid().options.slice(0, 3) };
    expect(err(validateImportRow(row))).toMatch(/options/);
  });

  it('rejects 5 options', () => {
    const row = { ...valid(), options: [...valid().options, { key: 'E', text: 'x' }] };
    expect(err(validateImportRow(row))).toBeTruthy();
  });

  it('rejects duplicate option keys', () => {
    const row = { ...valid(), options: valid().options.map((o) => ({ ...o, key: 'A' })) };
    expect(err(validateImportRow(row))).toMatch(/unique/i);
  });

  it('rejects blank option text', () => {
    const o = valid().options;
    o[2] = { key: 'C', text: '   ' };
    expect(err(validateImportRow({ ...valid(), options: o }))).toBeTruthy();
  });

  it('rejects a correct key that is not among the options', () => {
    expect(err(validateImportRow({ ...valid(), correctOption: 'E' }))).toBeTruthy();
    expect(err(validateImportRow({ ...valid(), correctOption: undefined }))).toBeTruthy();
  });

  it('requires statements for the statements format and forbids them for single', () => {
    expect(err(validateImportRow({ ...valid(), format: 'statements' }))).toMatch(/statements/);
    expect(err(validateImportRow({ ...valid(), format: 'statements', statements: [] }))).toMatch(/statements/);
    expect(err(validateImportRow({ ...valid(), statements: ['x'] }))).toMatch(/statements/);
  });

  it('rejects unsupported formats', () => {
    expect(err(validateImportRow({ ...valid(), format: 'passage' }))).toBeTruthy();
  });

  it('rejects a bad difficulty, subject id, or empty stem', () => {
    expect(err(validateImportRow({ ...valid(), difficulty: 'impossible' }))).toBeTruthy();
    expect(err(validateImportRow({ ...valid(), subjectNodeId: 'nope' }))).toBeTruthy();
    expect(err(validateImportRow({ ...valid(), stem: '   ' }))).toBeTruthy();
  });

  it('validates the misconception option key', () => {
    expect(err(validateImportRow({ ...valid(), misconception: { option: 'A', text: 'common slip' } }))).toBeUndefined();
    expect(err(validateImportRow({ ...valid(), misconception: { option: 'Z', text: 'x' } }))).toBeTruthy();
  });

  it('ignores a client-supplied verification or status', () => {
    const r = validateImportRow({ ...valid(), verificationStatus: 'verified', status: 'published' });
    expect(r).not.toHaveProperty('verificationStatus');
    expect(r).not.toHaveProperty('status');
  });

  it('rejects duplicate stems differing only in case or spacing, within a batch', () => {
    const seen = new Set<string>();
    expect(err(validateImportRow(valid(), seen))).toBeUndefined();
    const dup = { ...valid(), stem: '  WHICH article of   the Constitution\nabolishes untouchability? ' };
    expect(err(validateImportRow(dup, seen))).toMatch(/duplicate/i);
  });

  it('does not register the stem of an invalid row', () => {
    const seen = new Set<string>();
    expect(err(validateImportRow({ ...valid(), correctOption: 'Q' }, seen))).toBeTruthy();
    expect(err(validateImportRow(valid(), seen))).toBeUndefined();
  });
});

describe('normalizeStem', () => {
  it('trims, collapses whitespace and lower-cases', () => {
    expect(normalizeStem('  Hello \t WORLD\n')).toBe('hello world');
  });
});
