import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@marketplace/contracts/models/user';
import type { GatewayRequest } from '@modules/gateway/middleware/correlation-id.middleware';

@Injectable()
export class SellerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<GatewayRequest>();
    if (request.user?.roles.includes(UserRole.SELLER)) return true;
    throw new ForbiddenException('Only sellers can create products or categories');
  }
}
