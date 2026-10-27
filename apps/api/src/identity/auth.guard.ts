import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppError } from '../common/errors';
import { TokenVerifier } from './token-verifier';
import { UsersService } from './users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly verifier: TokenVerifier,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: unknown = req.headers?.authorization;
    const match = typeof header === 'string' ? /^Bearer\s+(\S+)$/i.exec(header) : null;
    if (!match) throw new AppError(401, 'unauthenticated', 'Authentication required');
    const claims = await this.verifier.verify(match[1]);
    req.user = await this.users.resolve(claims);
    return true;
  }
}
