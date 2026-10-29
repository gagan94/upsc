import { v5 } from 'uuid';

/** Fixed project namespace: seeded row ids are UUID v5 of a stable natural key, so re-runs hit the same rows. */
export const SEED_NAMESPACE = '6f1d3c2e-7b0a-4c58-9a41-2d5e8f3b7a10';

export const seedId = (naturalKey: string): string => v5(naturalKey, SEED_NAMESPACE);
