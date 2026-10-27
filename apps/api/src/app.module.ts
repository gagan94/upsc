import { DynamicModule, Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from './common/config';
import { Db, DbModule } from './db/db.module';
import { IdentityModule } from './identity/identity.module';
import { HealthController } from './health/health.controller';

export { APP_CONFIG };

@Module({})
export class AppModule {
  /** `db` lets tests supply their own database instead of a pg pool. */
  static forRoot(config: AppConfig, db?: Db): DynamicModule {
    return {
      module: AppModule,
      imports: [DbModule.forRoot(config, db), IdentityModule.forRoot(config)],
      controllers: [HealthController],
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
