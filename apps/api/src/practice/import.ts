import { z } from 'zod';
import { DIFFICULTIES, OPTION_KEYS, QUESTION_FORMATS, SOURCE_TYPES } from '../db/schema/practice';

/** Case- and whitespace-insensitive form of a stem, used for duplicate detection. */
export function normalizeStem(stem: string): string {
  return stem.trim().replace(/\s+/g, ' ').toLowerCase();
}

const optionKey = z.enum(OPTION_KEYS);
const text = (max: number) => z.string().trim().min(1).max(max);

/** Fields shared by create (required) and patch (all optional). Unknown keys, including verification and status, are stripped. */
export const questionFields = {
  format: z.enum(QUESTION_FORMATS),
  stem: text(2000),
  statements: z.array(text(1000)).min(1).max(10).nullable().optional(),
  options: z.array(z.object({ key: optionKey, text: text(500) })).length(4, 'Exactly four options are required'),
  correctOption: optionKey,
  explanation: z.string().trim().max(5000).optional(),
  optionReasoning: z.record(optionKey, text(1000)).optional(),
  misconception: z.object({ option: optionKey, text: text(1000) }).nullable().optional(),
  difficulty: z.enum(DIFFICULTIES),
  subjectNodeId: z.string().uuid(),
  topic: z.string().trim().min(1).max(200).nullable().optional(),
  gsPaper: text(50),
  sourceType: z.enum(SOURCE_TYPES).default('platform'),
  pyqYear: z.number().int().min(1950).max(2100).nullable().optional(),
  pyqPaper: z.string().trim().min(1).max(100).nullable().optional(),
};

interface Shape {
  format?: string;
  statements?: string[] | null;
  options?: Array<{ key: string }>;
  correctOption?: string;
}

/** Cross-field rules that must hold for any complete question (also applied to patched questions). */
export function checkShape(v: Shape, ctx: z.RefinementCtx): void {
  const keys = (v.options ?? []).map((o) => o.key);
  if (new Set(keys).size !== keys.length) {
    ctx.addIssue({ code: 'custom', path: ['options'], message: 'Option keys must be unique' });
  }
  if (v.correctOption !== undefined && !keys.includes(v.correctOption)) {
    ctx.addIssue({ code: 'custom', path: ['correctOption'], message: 'correctOption must be one of the option keys' });
  }
  const has = !!v.statements && v.statements.length > 0;
  if (v.format === 'statements' && !has) {
    ctx.addIssue({ code: 'custom', path: ['statements'], message: 'statements are required for the statements format' });
  }
  if (v.format === 'single' && v.statements != null) {
    ctx.addIssue({ code: 'custom', path: ['statements'], message: 'statements are only allowed for the statements format' });
  }
}

export const newQuestionSchema = z.object(questionFields).superRefine(checkShape);
export type NewQuestion = z.infer<typeof newQuestionSchema>;

/**
 * Validate one import row. `seenStems` holds normalised stems already accepted in this batch (or
 * existing in the bank); a valid row's stem is added to it so later duplicates are rejected.
 */
export function validateImportRow(row: unknown, seenStems?: Set<string>): NewQuestion | { error: string } {
  if (typeof row !== 'object' || row === null || Array.isArray(row)) return { error: 'Row must be an object' };
  const r = newQuestionSchema.safeParse(row);
  if (!r.success) {
    const i = r.error.issues[0];
    return { error: `${i.path.length ? `${i.path.join('.')}: ` : ''}${i.message}` };
  }
  if (seenStems) {
    const key = normalizeStem(r.data.stem);
    if (seenStems.has(key)) return { error: 'Duplicate stem' };
    seenStems.add(key);
  }
  return r.data;
}
