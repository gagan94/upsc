import { HttpException } from '@nestjs/common';

export class AppError extends HttpException {
  constructor(
    status: number,
    public readonly code: string,
    message: string,
    public readonly extra?: Record<string, unknown>,
  ) {
    super({ code, message, ...extra }, status);
  }
}
