import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { UserView } from './users.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): UserView => {
  return ctx.switchToHttp().getRequest().user;
});
