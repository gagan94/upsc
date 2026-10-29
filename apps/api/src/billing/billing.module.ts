import { Global, Module } from '@nestjs/common';
import { EntitlementGuard } from './entitlement.guard';
import { EntitlementsService } from './entitlements.service';

// Global so controllers in any module can use EntitlementGuard.
@Global()
@Module({
  providers: [EntitlementsService, EntitlementGuard],
  exports: [EntitlementsService, EntitlementGuard],
})
export class BillingModule {}
