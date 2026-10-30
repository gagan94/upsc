import { Module } from '@nestjs/common';
import { MeSettingsController } from './me-settings.controller';
import { PreparationService } from './preparation.service';

@Module({
  controllers: [MeSettingsController],
  providers: [PreparationService],
  exports: [PreparationService],
})
export class MeModule {}
