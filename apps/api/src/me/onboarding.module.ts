import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { PlannerModule } from '../planner/planner.module';
import { MeModule } from './me.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

/**
 * Separate from MeModule on purpose: PlannerModule already imports MeModule
 * (for PreparationService), so MeModule importing PlannerModule would be a cycle.
 */
@Module({
  imports: [MeModule, PlannerModule, CatalogModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
