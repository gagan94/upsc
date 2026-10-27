import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../common/errors';
import { EntitlementsService } from './entitlements.service';
import { ENTITLEMENT_META, EntitlementMeta } from './requires-entitlement.decorator';

/** Must run after AuthGuard. Consumes the entitlement declared by @RequiresEntitlement. */
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<EntitlementMeta | undefined>(ENTITLEMENT_META, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return true;
    const user = context.switchToHttp().getRequest().user;
    if (!user?.id) throw new AppError(401, 'unauthenticated', 'Authentication required');
    await this.entitlements.consume(user.id, meta.key, meta.cost);
    return true;
  }
}
