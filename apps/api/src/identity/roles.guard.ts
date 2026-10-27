import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../common/errors';
import { ROLES_KEY } from './decorators';
import type { UserView } from './users.service';

/** Use after AuthGuard. Roles come only from the database-backed UserView. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const user: UserView | undefined = context.switchToHttp().getRequest().user;
    if (!user || !required.some((r) => user.roles.includes(r))) {
      throw new AppError(403, 'forbidden', 'You do not have access to this resource');
    }
    return true;
  }
}
