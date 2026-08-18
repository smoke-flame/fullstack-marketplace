import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { env } from '@config/env';
import { ServiceUnavailableException } from '@modules/common/errors/gateway-errors';

@Injectable()
export class InternalOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.header('x-internal-key');
    if (!key || key !== env.INTERNAL_API_KEY) {
      throw new ServiceUnavailableException();
    }
    return true;
  }
}
