import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ErrorFilter } from './common/error.filter';

export const JSON_BODY_LIMIT = '5mb';

export function configureApp(app: INestApplication): void {
  // Bulk question import (up to 500 items) exceeds Express's 100 kb default.
  (app as NestExpressApplication).useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ErrorFilter());
}
