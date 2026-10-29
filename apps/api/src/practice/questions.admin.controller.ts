import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { decodeCursor, parseLimit } from '../common/cursor';
import { AppError } from '../common/errors';
import { parse } from '../common/validation';
import { QUESTION_STATUSES, SOURCE_TYPES } from '../db/schema/practice';
import { AuthGuard } from '../identity/auth.guard';
import { CurrentUser, Roles } from '../identity/decorators';
import { RolesGuard } from '../identity/roles.guard';
import type { UserView } from '../identity/users.service';
import { newQuestionSchema, normalizeStem, questionFields, validateImportRow, NewQuestion } from './import';
import { QuestionsService, verifySchema } from './questions.service';

const uuid = z.string().uuid();
const patchSchema = z.object(questionFields).partial().extend({ reason: z.string().trim().max(500).optional() });
const importSchema = z.object({ items: z.array(z.unknown()).min(1).max(500) });
const listSchema = z.object({
  status: z.enum([...QUESTION_STATUSES, 'all']).optional(),
  subjectNodeId: uuid.optional(),
  sourceType: z.enum(SOURCE_TYPES).optional(),
  q: z.string().trim().min(1).max(200).optional(),
});

const qid = (raw: string): string => {
  const r = uuid.safeParse(raw);
  if (!r.success) throw new AppError(404, 'not_found', 'Question not found');
  return r.data;
};

@Controller('admin/questions')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'content_editor')
export class QuestionsAdminController {
  constructor(private readonly questions: QuestionsService) {}

  @Get()
  async list(@Query() query: Record<string, string | undefined>) {
    const f = parse(listSchema, { status: query.status, subjectNodeId: query.subjectNodeId, sourceType: query.sourceType, q: query.q });
    return this.questions.list({
      ...f,
      cursor: query.cursor ? decodeCursor(query.cursor) : null,
      limit: parseLimit(query.limit),
    });
  }

  @Post()
  async create(@CurrentUser() user: UserView, @Body() body: unknown) {
    return { question: await this.questions.create(user.id, parse(newQuestionSchema, body)) };
  }

  // Declared before ':id/*' routes so "import" is never read as an id.
  @Post('import')
  async import(@CurrentUser() user: UserView, @Body() body: unknown) {
    const { items } = parse(importSchema, body);
    const errors: Array<{ index: number; message: string }> = [];
    const seen = new Set<string>();
    const candidates: Array<{ index: number; row: NewQuestion }> = [];
    items.forEach((item, index) => {
      const r = validateImportRow(item, seen);
      if ('error' in r) errors.push({ index, message: r.error });
      else candidates.push({ index, row: r });
    });

    const known = await this.questions.knownSubjects([...new Set(candidates.map((c) => c.row.subjectNodeId))]);
    const existing = await this.questions.existingStems(candidates.map((c) => normalizeStem(c.row.stem)));
    const valid: NewQuestion[] = [];
    for (const { index, row } of candidates) {
      if (!known.has(row.subjectNodeId)) errors.push({ index, message: 'subjectNodeId: unknown syllabus node' });
      else if (existing.has(normalizeStem(row.stem))) errors.push({ index, message: 'Duplicate stem: already exists in the question bank' });
      else valid.push(row);
    }
    const created = await this.questions.insertDrafts(user.id, valid);
    errors.sort((a, b) => a.index - b.index);
    return { created, errors };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return { question: await this.questions.get(qid(id)) };
  }

  @Patch(':id')
  async update(@CurrentUser() user: UserView, @Param('id') id: string, @Body() body: unknown) {
    const patch = parse(patchSchema, body);
    return { question: await this.questions.update(qid(id), user.id, patch as never) };
  }

  @Post(':id/publish')
  @HttpCode(200)
  async publish(@Param('id') id: string) {
    return { question: await this.questions.publish(qid(id)) };
  }

  @Post(':id/retire')
  @HttpCode(200)
  async retire(@Param('id') id: string) {
    return { question: await this.questions.retire(qid(id)) };
  }

  @Post(':id/verify')
  @HttpCode(200)
  async verify(@Param('id') id: string, @Body() body: unknown) {
    return { question: await this.questions.verify(qid(id), parse(verifySchema, body ?? {})) };
  }
}
