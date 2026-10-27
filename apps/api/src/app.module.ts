import { DynamicModule, Module } from '@nestjs/common';
import { AppConfig } from './common/config';
import { Db, DbModule } from './db/db.module';
import { HealthController } from './health/health.controller';

export const APP_CONFIG = 'APP_CONFIG';

@Module({})
export class AppModule {
  /** `db` lets tests supply their own database instead of a pg pool. */
  static forRoot(config: AppConfig, db?: Db): DynamicModule {
    return {
      module: AppModule,
      imports: [DbModule.forRoot(config, db)],
      controllers: [HealthController],
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
