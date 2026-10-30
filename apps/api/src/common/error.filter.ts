import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from './errors';

const STATUS_CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'unprocessable',
  429: 'too_many_requests',
};

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('ErrorFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppError) {
      const { code, message, ...extra } = exception.getResponse() as Record<string, unknown>;
      res.status(exception.getStatus()).json({ error: { code, message, ...extra } });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message = typeof body === 'string' ? body : ((body as { message?: unknown }).message ?? exception.message);
      res.status(status).json({
        error: { code: STATUS_CODES[status] ?? (status >= 500 ? 'internal_error' : 'error'), message },
      });
      return;
    }
    // body-parser (http-errors) failures: oversized or malformed JSON.
    const bp = exception as { type?: string; status?: number } | null;
    if (bp?.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'payload_too_large', message: 'Request body is too large' } });
      return;
    }
    if (bp?.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'bad_request', message: 'Malformed JSON body' } });
      return;
    }
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error' } });
  }
}
