import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createTestApp } from '../../test/app';
import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import type { Db } from '../db/db.module';
import { newId } from '../db/ids';
import { entitlementOverrides, featureCatalog, planEntitlements, plans, users } from '../db/schema';
import { AuthGuard } from '../identity/auth.guard';
import { EntitlementGuard } from './entitlement.guard';
import { RequiresEntitlement } from './requires-entitlement.decorator';

jest.setTimeout(30000);

@Controller('ent-test')
class EntController {
  @Get('offline')
  @UseGuards(AuthGuard, EntitlementGuard)
  @RequiresEntitlement('notes.offline')
  offline() {
    return { ok: true };
  }

  // misconfigured on purpose: guard without AuthGuard must fail closed
  @Get('noauth')
  @UseGuards(EntitlementGuard)
  @RequiresEntitlement('notes.offline')
  noauth() {
    return { ok: true };
  }
}

describe('EntitlementGuard', () => {
  let app: INestApplication;
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ app, db, close } = await createTestApp({
      config: { supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET } },
      controllers: [EntController],
    }));
    const freeId = newId();
    await db.insert(featureCatalog).values({ key: 'notes.offline', name: 'Offline', type: 'boolean', defaultPeriod: 'none' });
    await db.insert(plans).values({ id: freeId, key: 'free', name: 'Free', isDefault: true, status: 'active' });
    await db.insert(planEntitlements).values({
      planId: freeId, featureKey: 'notes.offline', enabled: false, limitValue: null, period: 'none',
    });
  });
  afterAll(() => close());

  it('402 for a free student, 200 once an override exists', async () => {
    const token = await signTestToken({ sub: 'ent-1', email: 'ent@example.com' });
    const get = () =>
      request(app.getHttpServer()).get('/api/v1/ent-test/offline').set('Authorization', `Bearer ${token}`);
    const denied = await get().expect(402);
    expect(denied.body.error.code).toBe('entitlement_required');
    const [u] = await db.select().from(users).where(eq(users.authSubject, 'ent-1'));
    await db.insert(entitlementOverrides).values({
      id: newId(), userId: u.id, featureKey: 'notes.offline', enabled: true, period: 'none', reason: 'test',
    });
    await get().expect(200);
  });

  it('401 without a token', async () => {
    await request(app.getHttpServer()).get('/api/v1/ent-test/offline').expect(401);
  });

  it('fails closed (401) when AuthGuard did not run', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/ent-test/noauth').expect(401);
    expect(res.body.error.code).toBe('unauthenticated');
  });
});
