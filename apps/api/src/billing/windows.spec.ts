import { windowFor } from './windows';

const iso = (d: Date | null) => d?.toISOString();

describe('windowFor', () => {
  it('day in Asia/Kolkata: just before and after local midnight', () => {
    // 2026-03-10T18:29:59Z = 23:59:59 IST on Mar 10
    const before = windowFor('day', 'Asia/Kolkata', new Date('2026-03-10T18:29:59Z'));
    expect(iso(before.start)).toBe('2026-03-09T18:30:00.000Z');
    expect(iso(before.resetsAt)).toBe('2026-03-10T18:30:00.000Z');
    const after = windowFor('day', 'Asia/Kolkata', new Date('2026-03-10T18:30:00Z'));
    expect(iso(after.start)).toBe('2026-03-10T18:30:00.000Z');
    expect(iso(after.resetsAt)).toBe('2026-03-11T18:30:00.000Z');
  });

  it('day in America/New_York: before and after midnight (EDT, UTC-4)', () => {
    const before = windowFor('day', 'America/New_York', new Date('2026-07-01T03:59:59Z'));
    expect(iso(before.start)).toBe('2026-06-30T04:00:00.000Z');
    expect(iso(before.resetsAt)).toBe('2026-07-01T04:00:00.000Z');
    const after = windowFor('day', 'America/New_York', new Date('2026-07-01T04:00:00Z'));
    expect(iso(after.start)).toBe('2026-07-01T04:00:00.000Z');
  });

  it('day across a DST change in New_York (23h day)', () => {
    // 2026-03-08 spring forward; midnight EST = 05:00Z, next midnight EDT = 04:00Z
    const w = windowFor('day', 'America/New_York', new Date('2026-03-08T12:00:00Z'));
    expect(iso(w.start)).toBe('2026-03-08T05:00:00.000Z');
    expect(iso(w.resetsAt)).toBe('2026-03-09T04:00:00.000Z');
  });

  it('week starts Monday 00:00 local', () => {
    // 2026-03-15 is a Sunday; week began Monday 2026-03-09
    const w = windowFor('week', 'Asia/Kolkata', new Date('2026-03-15T10:00:00Z'));
    expect(iso(w.start)).toBe('2026-03-08T18:30:00.000Z');
    expect(iso(w.resetsAt)).toBe('2026-03-15T18:30:00.000Z');
    // Sunday 18:30Z is already Monday 00:00 IST -> new week
    const next = windowFor('week', 'Asia/Kolkata', new Date('2026-03-15T18:30:00Z'));
    expect(iso(next.start)).toBe('2026-03-15T18:30:00.000Z');
    expect(iso(next.resetsAt)).toBe('2026-03-22T18:30:00.000Z');
  });

  it('week in New_York on a Monday', () => {
    const w = windowFor('week', 'America/New_York', new Date('2026-07-06T02:00:00Z')); // Sun Jul 5 22:00 EDT
    expect(iso(w.start)).toBe('2026-06-29T04:00:00.000Z');
    expect(iso(w.resetsAt)).toBe('2026-07-06T04:00:00.000Z');
  });

  it('month is the calendar month in the zone', () => {
    // 2026-02-28T18:30Z = Mar 1 00:00 IST
    const w = windowFor('month', 'Asia/Kolkata', new Date('2026-02-28T18:30:00Z'));
    expect(iso(w.start)).toBe('2026-02-28T18:30:00.000Z');
    expect(iso(w.resetsAt)).toBe('2026-03-31T18:30:00.000Z');
    const before = windowFor('month', 'Asia/Kolkata', new Date('2026-02-28T18:29:59Z'));
    expect(iso(before.start)).toBe('2026-01-31T18:30:00.000Z');
    expect(iso(before.resetsAt)).toBe('2026-02-28T18:30:00.000Z');
  });

  it('month rolls over the year in New_York', () => {
    const w = windowFor('month', 'America/New_York', new Date('2026-12-15T12:00:00Z'));
    expect(iso(w.start)).toBe('2026-12-01T05:00:00.000Z');
    expect(iso(w.resetsAt)).toBe('2027-01-01T05:00:00.000Z');
  });

  it('lifetime and none use a fixed epoch start and no reset', () => {
    for (const p of ['lifetime', 'none'] as const) {
      const w = windowFor(p, 'Asia/Kolkata', new Date('2026-03-10T00:00:00Z'));
      expect(iso(w.start)).toBe('1970-01-01T00:00:00.000Z');
      expect(w.resetsAt).toBeNull();
    }
  });
});
