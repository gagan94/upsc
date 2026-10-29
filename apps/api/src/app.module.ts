import { DynamicModule, Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from './common/config';
import { Db, DbModule } from './db/db.module';
import { IdentityModule } from './identity/identity.module';
import { HealthController } from './health/health.controller';
import { BillingModule } from './billing/billing.module';
import { CatalogModule } from './catalog/catalog.module';
import { AdminModule } from './admin/admin.module';
import { MeModule } from './me/me.module';
import { PlannerModule } from './planner/planner.module';

export { APP_CONFIG };

@Module({})
export class AppModule {
  /** `db` lets tests supply their own database instead of a pg pool. */
  static forRoot(config: AppConfig, db?: Db): DynamicModule {
    return {
      module: AppModule,
      imports: [DbModule.forRoot(config, db), IdentityModule.forRoot(config), BillingModule, CatalogModule, AdminModule, MeModule, PlannerModule],
      controllers: [HealthController],
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
