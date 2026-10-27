import { INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { AppConfig, loadConfig } from '../src/common/config';

type Db = unknown; // TODO: replaced by real Db type in Task 3

export async function createTestApp(
  overrides: { config?: Partial<AppConfig>; controllers?: Function[] } = {},
): Promise<{ app: INestApplication; db: Db; close(): Promise<void> }> {
  const config: AppConfig = {
    ...loadConfig({ DATABASE_URL: 'postgres://test', SUPABASE_URL: 'https://test.supabase.co' }),
    ...overrides.config,
  };
  @Module({ controllers: overrides.controllers as never[] })
  class ExtraModule {}
  const builder = Test.createTestingModule({
    imports: [AppModule.forRoot(config), ...(overrides.controllers ? [ExtraModule] : [])],
  });
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  app.useLogger(false);
  configureApp(app);
  await app.init();
  return { app, db: undefined, close: () => app.close() };
}
