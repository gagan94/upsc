import { Controller, Get, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../test/app';
import { AppError } from '../common/errors';

@Controller('boom')
class BoomController {
  @Get('conflict')
  conflict(): never {
    throw new AppError(409, 'x_conflict', 'm');
  }
  @Get('crash')
  crash(): never {
    throw new Error('secret internals');
  }
}

describe('health and error envelope', () => {
  let app: INestApplication;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ app, close } = await createTestApp({ controllers: [BoomController] }));
  });
  afterAll(() => close());

  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('unknown route renders not_found envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('AppError renders code and message', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/boom/conflict').expect(409);
    expect(res.body).toEqual({ error: { code: 'x_conflict', message: 'm' } });
  });

  it('unknown errors render 500 internal_error without leaking', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/boom/crash').expect(500);
    expect(res.body.error.code).toBe('internal_error');
    expect(JSON.stringify(res.body)).not.toContain('secret internals');
  });
});
