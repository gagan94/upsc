import { SetMetadata } from '@nestjs/common';
import type { FeatureKey } from './feature-keys';

export const ENTITLEMENT_META = 'entitlement';
export interface EntitlementMeta {
  key: FeatureKey;
  cost: number;
}

export const RequiresEntitlement = (key: FeatureKey, cost = 1) =>
  SetMetadata(ENTITLEMENT_META, { key, cost } satisfies EntitlementMeta);
