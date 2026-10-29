import { dayRange, localDateOf, monthRange, weekRange } from './dates';

const iso = (r: { start: Date; end: Date }) => [r.start.toISOString(), r.end.toISOString()];

describe('dates', () => {
  it('dayRange in Asia/Kolkata', () => {
    expect(iso(dayRange('2026-10-14', 'Asia/Kolkata'))).toEqual(['2026-10-13T18:30:00.000Z', '2026-10-14T18:30:00.000Z']);
  });

  it('localDateOf respects the zone boundary', () => {
    expect(localDateOf(new Date('2026-10-14T18:10:00Z'), 'Asia/Kolkata')).toBe('2026-10-14');
    expect(localDateOf(new Date('2026-10-14T18:40:00Z'), 'Asia/Kolkata')).toBe('2026-10-15');
  });

  it('weekRange Monday start and Sunday start', () => {
    expect(iso(weekRange('2026-10-14', 'Asia/Kolkata', 'monday'))).toEqual(['2026-10-11T18:30:00.000Z', '2026-10-18T18:30:00.000Z']);
    expect(iso(weekRange('2026-10-14', 'Asia/Kolkata', 'sunday'))).toEqual(['2026-10-10T18:30:00.000Z', '2026-10-17T18:30:00.000Z']);
    // a Sunday belongs to the week that began the previous Monday
    expect(iso(weekRange('2026-10-18', 'Asia/Kolkata', 'monday'))[0]).toBe('2026-10-11T18:30:00.000Z');
  });

  it('monthRange in Asia/Kolkata', () => {
    expect(iso(monthRange(2026, 10, 'Asia/Kolkata'))).toEqual(['2026-09-30T18:30:00.000Z', '2026-10-31T18:30:00.000Z']);
    expect(iso(monthRange(2026, 12, 'Asia/Kolkata'))[1]).toBe('2026-12-31T18:30:00.000Z');
  });

  it('DST days in America/New_York are 23 or 25 hours', () => {
    const hours = (d: string) => {
      const r = dayRange(d, 'America/New_York');
      return (r.end.getTime() - r.start.getTime()) / 3600000;
    };
    expect(hours('2026-03-08')).toBe(23);
    expect(hours('2026-11-01')).toBe(25);
    expect(hours('2026-06-15')).toBe(24);
    expect(dayRange('2026-03-08', 'America/New_York').start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(localDateOf(new Date('2026-11-01T04:30:00Z'), 'America/New_York')).toBe('2026-11-01');
  });
});
