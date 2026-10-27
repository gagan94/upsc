import { INestApplication } from '@nestjs/common';
import { ErrorFilter } from './common/error.filter';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ErrorFilter());
}
