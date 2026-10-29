import type { z } from 'zod';
import { AppError } from './errors';

/** Validate untrusted input against a zod schema; unknown keys are stripped. */
export function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.length ? `${first.path.join('.')}: ` : '';
    throw new AppError(400, 'validation_failed', `${path}${first?.message ?? 'Invalid input'}`, {
      issues: result.error.issues,
    });
  }
  return result.data;
}
