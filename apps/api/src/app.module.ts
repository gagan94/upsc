import { DynamicModule, Module } from '@nestjs/common';
import { AppConfig } from './common/config';
import { HealthController } from './health/health.controller';

export const APP_CONFIG = 'APP_CONFIG';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController],
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
