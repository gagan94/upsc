import { z } from 'zod';
import { AppError } from './errors';
import { parse } from './validation';

const schema = z.object({ name: z.string(), age: z.number() });

describe('parse', () => {
  it('returns typed data for valid input', () => {
    const out: { name: string; age: number } = parse(schema, { name: 'a', age: 3 });
    expect(out).toEqual({ name: 'a', age: 3 });
  });

  it('strips unknown keys', () => {
    expect(parse(schema, { name: 'a', age: 3, extra: 1 })).toEqual({ name: 'a', age: 3 });
  });

  it('throws 400 validation_failed for a missing required field', () => {
    try {
      parse(schema, { name: 'a' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).getStatus()).toBe(400);
      expect((e as AppError).code).toBe('validation_failed');
      expect((e as AppError).extra?.issues).toBeDefined();
    }
  });

  it('throws 400 validation_failed for a wrong type', () => {
    try {
      parse(schema, { name: 'a', age: 'x' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).getStatus()).toBe(400);
      expect((e as AppError).code).toBe('validation_failed');
    }
  });
});
